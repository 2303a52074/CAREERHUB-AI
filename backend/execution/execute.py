import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time


MAX_SOURCE_BYTES = 20000
MAX_INPUT_BYTES = 5000
MAX_CASES = 30
MAX_OUTPUT_BYTES = 12000
LANGUAGES = {
    "python": ("Main.py", ["python3", "-m", "py_compile"]),
    "javascript": ("Main.js", ["node", "--check"]),
    "java": ("Main.java", ["javac", "-encoding", "UTF-8", "-d"]),
    "cpp": ("Main.cpp", ["g++", "-std=c++17", "-O2", "-pipe"]),
}
BASE_ENV = {
    "PATH": "/usr/local/bin:/usr/bin:/bin",
    "LANG": "C.UTF-8",
    "LC_ALL": "C.UTF-8",
    "HOME": "/tmp",
    "TMPDIR": "/tmp",
}


def fail(status, message):
    return {"status": status, "message": message}


def run_process(command, stdin, timeout, cwd):
    try:
        completed = subprocess.run(
            command,
            input=stdin.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
            env=BASE_ENV,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return None, "time_limit"
    except OSError:
        return None, "internal_error"
    stdout = completed.stdout[:MAX_OUTPUT_BYTES]
    stderr = completed.stderr[:MAX_OUTPUT_BYTES]
    return {
        "returncode": completed.returncode,
        "stdout": stdout.decode("utf-8", errors="replace"),
        "stderr": stderr.decode("utf-8", errors="replace"),
        "truncated": len(completed.stdout) > MAX_OUTPUT_BYTES or len(completed.stderr) > MAX_OUTPUT_BYTES,
    }, None


def execute(request):
    if request.get("healthCheck") is True:
        return {"status": "ready"}
    language = request.get("language")
    source = request.get("source")
    cases = request.get("cases")
    timeout = request.get("timeLimit")
    if language not in LANGUAGES or not isinstance(source, str) or not source.strip():
        return fail("internal_error", "Invalid execution request.")
    if len(source.encode("utf-8")) > MAX_SOURCE_BYTES or not isinstance(cases, list) or not cases or len(cases) > MAX_CASES:
        return fail("internal_error", "The execution request exceeds supported limits.")
    if not isinstance(timeout, (int, float)) or timeout <= 0 or timeout > 5:
        return fail("internal_error", "The execution time limit is invalid.")

    filename, compiler = LANGUAGES[language]
    with tempfile.TemporaryDirectory(prefix="careerhub-") as directory:
        workspace = pathlib.Path(directory)
        source_path = workspace / filename
        source_path.write_text(source, encoding="utf-8")
        binary_path = workspace / "program"
        java_classes = workspace / "classes"
        java_classes.mkdir()

        if compiler:
            if language == "java":
                command = compiler + [str(java_classes), str(source_path)]
            elif language == "cpp":
                command = compiler + [str(source_path), "-o", str(binary_path)]
            else:
                command = compiler + [str(source_path)]
            started = time.monotonic()
            compiled, timeout_status = run_process(command, "", min(15, timeout + 13), directory)
            if timeout_status:
                return fail(timeout_status, "Compilation exceeded the allowed time.")
            if compiled["returncode"] != 0:
                return {
                    "status": "compilation_error",
                    "message": compiled["stderr"] or compiled["stdout"] or "Compilation failed.",
                    "compileTimeMs": round((time.monotonic() - started) * 1000),
                }

        results = []
        total_runtime = 0
        runtime_timeout = min(5, timeout * 2) if language == "java" else timeout
        for case in cases:
            stdin = case.get("stdin")
            if not isinstance(stdin, str) or len(stdin.encode("utf-8")) > MAX_INPUT_BYTES:
                return fail("internal_error", "A test input exceeds the supported size.")
            if language == "python":
                command = ["python3", str(source_path)]
            elif language == "javascript":
                command = ["node", str(source_path)]
            elif language == "java":
                command = ["java", "-XX:ActiveProcessorCount=1", "-Xmx128m", "-cp", str(java_classes), "Main"]
            else:
                command = [str(binary_path)]

            started = time.monotonic()
            result, execution_status = run_process(command, stdin, runtime_timeout, directory)
            elapsed = round((time.monotonic() - started) * 1000)
            total_runtime += elapsed
            if execution_status:
                return {
                    "status": execution_status,
                    "message": "Execution exceeded the per-test time limit." if execution_status == "time_limit" else "The isolated runner could not start the program.",
                    "results": results,
                    "runtimeMs": total_runtime,
                }
            if result["truncated"]:
                return {
                    "status": "runtime_error",
                    "message": "Program output exceeded the 12 KB output limit.",
                    "results": results,
                    "runtimeMs": total_runtime,
                }
            results.append({
                "returncode": result["returncode"],
                "stdout": result["stdout"],
                "stderr": result["stderr"],
                "runtimeMs": elapsed,
            })
            if result["returncode"] in (-9, 137):
                return {
                    "status": "memory_limit",
                    "message": "The program exceeded the local container memory limit.",
                    "results": results,
                    "runtimeMs": total_runtime,
                }
            if result["returncode"] != 0:
                return {
                    "status": "runtime_error",
                    "message": result["stderr"] or "The program exited with a non-zero status.",
                    "results": results,
                    "runtimeMs": total_runtime,
                }

        return {
            "status": "completed",
            "results": results,
            "runtimeMs": total_runtime,
        }


def main():
    try:
        payload = sys.stdin.buffer.read(MAX_SOURCE_BYTES * 4 + MAX_INPUT_BYTES * MAX_CASES)
        request = json.loads(payload)
        response = execute(request)
    except Exception:
        response = fail("internal_error", "The local execution runner failed.")
    sys.stdout.write(json.dumps(response, separators=(",", ":")))


if __name__ == "__main__":
    main()
