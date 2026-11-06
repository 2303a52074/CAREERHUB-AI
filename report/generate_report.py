from pathlib import Path
from datetime import date

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT = Path(__file__).resolve().parent / "CareerHub_AI_Final_Year_Project_Report.docx"
ACCESS_DATE = date.today().isoformat()
NAVY = "10233F"
BLUE = "176B87"
CYAN = "DDF4F5"
PALE = "F1F5F9"
MID = "526174"
WHITE = "FFFFFF"
BLACK = "17212B"


def shade(cell, fill):
    properties = cell._tc.get_or_add_tcPr()
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), fill)
    properties.append(shading)


def set_cell_text(cell, text, bold=False, color=BLACK, size=9):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(2)
    run = paragraph.add_run(str(text))
    run.bold = bold
    run.font.name = "Aptos"
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def set_repeat_table_header(row):
    properties = row._tr.get_or_add_trPr()
    repeat = OxmlElement("w:tblHeader")
    repeat.set(qn("w:val"), "true")
    properties.append(repeat)


def set_keep_with_next(paragraph):
    paragraph.paragraph_format.keep_with_next = True


def add_field(paragraph, instruction):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    code = OxmlElement("w:instrText")
    code.set(qn("xml:space"), "preserve")
    code.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    placeholder = OxmlElement("w:t")
    placeholder.text = "Update field in Word (Ctrl+A, F9)"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, code, separate, placeholder, end])


def add_hyperlink(paragraph, label, address):
    relationship = paragraph.part.relate_to(
        address,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), relationship)
    run = OxmlElement("w:r")
    properties = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), BLUE)
    properties.append(color)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    properties.append(underline)
    run.append(properties)
    text = OxmlElement("w:t")
    text.text = label
    run.append(text)
    link.append(run)
    paragraph._p.append(link)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    margins = tc_pr.first_child_found_in("w:tcMar")
    if margins is None:
        margins = OxmlElement("w:tcMar")
        tc_pr.append(margins)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = margins.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            margins.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def format_table(table, header=True, widths=None):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = False
    for row_index, row in enumerate(table.rows):
        if row_index == 0 and header:
            set_repeat_table_header(row)
        for column_index, cell in enumerate(row.cells):
            set_cell_margins(cell)
            if widths and column_index < len(widths):
                cell.width = Inches(widths[column_index])
            if header and row_index == 0:
                shade(cell, NAVY)
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.bold = True
                        run.font.color.rgb = RGBColor.from_string(WHITE)
                        run.font.size = Pt(9)
            elif row_index % 2 == 0:
                shade(cell, PALE)


def table(document, headers, rows, widths=None, font_size=8.5):
    result = document.add_table(rows=1, cols=len(headers))
    for cell, value in zip(result.rows[0].cells, headers):
        set_cell_text(cell, value, bold=True, color=WHITE, size=9)
    for values in rows:
        cells = result.add_row().cells
        for cell, value in zip(cells, values):
            set_cell_text(cell, value, size=font_size)
    format_table(result, widths=widths)
    document.add_paragraph().paragraph_format.space_after = Pt(1)
    return result


def heading(document, text, level=1):
    item = document.add_heading(text, level=level)
    set_keep_with_next(item)
    return item


def paragraph(document, text, bold_lead=None):
    item = document.add_paragraph()
    item.paragraph_format.space_after = Pt(6)
    item.paragraph_format.line_spacing = 1.08
    if bold_lead and text.startswith(bold_lead):
        item.add_run(bold_lead).bold = True
        item.add_run(text[len(bold_lead):])
    else:
        item.add_run(text)
    return item


def bullets(document, items):
    for text in items:
        item = document.add_paragraph(style="List Bullet")
        item.paragraph_format.space_after = Pt(3)
        item.add_run(text)


def numbered(document, items):
    for text in items:
        item = document.add_paragraph(style="List Number")
        item.paragraph_format.space_after = Pt(3)
        item.add_run(text)


def caption(document, text):
    item = document.add_paragraph()
    item.alignment = WD_ALIGN_PARAGRAPH.CENTER
    item.paragraph_format.space_after = Pt(8)
    run = item.add_run(text)
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor.from_string(MID)


def note_box(document, title, text, fill=CYAN):
    box = document.add_table(rows=1, cols=1)
    cell = box.cell(0, 0)
    shade(cell, fill)
    set_cell_margins(cell, 150, 180, 150, 180)
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    first = p.add_run(title + "  ")
    first.bold = True
    first.font.color.rgb = RGBColor.from_string(NAVY)
    p.add_run(text)
    format_table(box, header=False)
    document.add_paragraph().paragraph_format.space_after = Pt(1)


def add_screenshot_placeholder(document, name, purpose):
    slot = document.add_table(rows=1, cols=1)
    cell = slot.cell(0, 0)
    shade(cell, PALE)
    set_cell_margins(cell, 520, 200, 520, 200)
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    line = p.add_run("SCREENSHOT NOT CAPTURED")
    line.bold = True
    line.font.size = Pt(14)
    line.font.color.rgb = RGBColor.from_string(MID)
    detail = cell.add_paragraph()
    detail.alignment = WD_ALIGN_PARAGRAPH.CENTER
    detail.add_run(f"Reserved for a genuine browser capture: {name}\n{purpose}")
    format_table(slot, header=False)
    caption(document, f"Figure placeholder — {name}. Replace only with an unaltered capture from a verified run.")


def add_contents_page(document):
    heading(document, "Table of Contents", 1)
    paragraph(document, "The table of contents is a Word field. If it is not populated automatically, select it and press Ctrl+A, then F9.")
    p = document.add_paragraph()
    add_field(p, 'TOC \\o "1-3" \\h \\z \\u')
    document.add_page_break()


def add_reference(document, number, title, organization, url, access_note=""):
    p = document.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.first_line_indent = Inches(-0.25)
    p.add_run(f"[{number}] {title}. {organization}. ")
    add_hyperlink(p, url, url)
    if access_note:
        p.add_run(f" ({access_note})")


def configure(document):
    section = document.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.68)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)

    normal = document.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_after = Pt(5)
    for name, size, color in (
        ("Title", 30, NAVY),
        ("Heading 1", 19, NAVY),
        ("Heading 2", 14, BLUE),
        ("Heading 3", 11, NAVY),
    ):
        style = document.styles[name]
        style.font.name = "Aptos Display"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(12)
        style.paragraph_format.space_after = Pt(5)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = header.add_run("CAREERHUB AI  |  FINAL YEAR PROJECT")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MID)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run("Editable academic report  •  ")
    add_field(footer, "PAGE")

    settings = document.settings._element
    update = OxmlElement("w:updateFields")
    update.set(qn("w:val"), "true")
    settings.append(update)


def build():
    doc = Document()
    configure(doc)

    # Cover
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(75)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    label = p.add_run("BACHELOR OF TECHNOLOGY\nFINAL YEAR PROJECT REPORT")
    label.bold = True
    label.font.size = Pt(13)
    label.font.color.rgb = RGBColor.from_string(BLUE)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(35)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title = p.add_run("CAREERHUB AI")
    title.bold = True
    title.font.size = Pt(34)
    title.font.color.rgb = RGBColor.from_string(NAVY)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle = p.add_run("Career and Placement Intelligence Platform")
    subtitle.font.size = Pt(17)
    subtitle.font.color.rgb = RGBColor.from_string(BLUE)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("A project report submitted in partial fulfillment of the requirements\nfor the degree of Bachelor of Technology in [BRANCH / SPECIALIZATION]").font.size = Pt(11)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(24)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Submitted by\n[STUDENT NAME]\n[REGISTRATION / ROLL NUMBER]").bold = True
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Under the guidance of\n[PROJECT GUIDE NAME AND DESIGNATION]")
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(22)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("[DEPARTMENT NAME]\n[COLLEGE / UNIVERSITY NAME]\n[ACADEMIC YEAR]")
    note_box(doc, "Editable placeholders", "Replace all bracketed fields with institution-approved information. No student, guide, institution, approval, or signature details were inferred.", PALE)
    doc.add_page_break()

    # Preliminary pages
    heading(doc, "Certificate", 1)
    paragraph(doc, "This is to certify that the project report entitled “CareerHub AI: Career and Placement Intelligence Platform” is submitted by [STUDENT NAME], [REGISTRATION / ROLL NUMBER], in partial fulfillment of the requirements for the degree of Bachelor of Technology in [BRANCH] at [INSTITUTION]. The work described in this report is based on the software repository and verification evidence identified herein.")
    paragraph(doc, "Guide: [NAME / DESIGNATION]     Signature: ____________________     Date: __________")
    paragraph(doc, "Head of Department: [NAME]     Signature: ____________________     Date: __________")
    paragraph(doc, "Institutional approval and originality statements must be completed and signed only by authorized persons.")
    doc.add_page_break()

    heading(doc, "Declaration", 1)
    paragraph(doc, "I/We, [STUDENT NAME(S)], declare that this report is prepared for the academic project identified on the cover page. Repository implementation details and test outcomes are reported according to the inspected source and recorded command output. Provider-dependent behavior that could not be verified is identified as blocked or unverified rather than represented as successful.")
    paragraph(doc, "Student signature(s): __________________________     Date: __________")
    doc.add_page_break()

    heading(doc, "Acknowledgment", 1)
    paragraph(doc, "[Add acknowledgments only after confirming the people and organizations to be named. This editable section intentionally contains no invented personal details.]")
    doc.add_page_break()

    heading(doc, "Abstract", 1)
    paragraph(doc, "CareerHub AI is a web-based career and placement preparation platform. The active application combines a Node.js and Express backend with a static multi-page HTML, CSS, and browser-JavaScript frontend. It provides authenticated career-profile workflows, readiness and progress views, assessment, skill-gap and roadmap support, daily planning, coding practice, interview practice, resume analysis, job-description analysis, job discovery and application tracking, learning resources, recommendations, and a career assistant.")
    paragraph(doc, "The backend exposes REST endpoints, uses MongoDB/Mongoose models when a database is configured, and includes a process-local in-memory development fallback. Authentication uses password hashing and bearer JWTs. AI generation is routed through a shared service that selects Gemini when configured and otherwise OpenRouter; provider errors are surfaced rather than replaced with fabricated model output. Deterministic application logic handles assessment scoring, readiness calculations, coding test evaluation, job matching, and progress updates.")
    paragraph(doc, "Verification performed for this report includes the repository unit suite, build/lint checks, and an isolated API acceptance suite. The unit suite passed. Build and lint checks passed. The API suite recorded 98 passed, 0 failed, and 11 blocked checks; provider-dependent checks were blocked because no provider credential was configured in the isolated test process. A prior genuine Gemini attempt in the project history returned an authentication error, so successful live model generation is not established by this report. Browser screenshots and authenticated manual UI testing were not captured for this report.")
    p = doc.add_paragraph()
    p.add_run("Keywords: ").bold = True
    p.add_run("career platform, placement preparation, Express, MongoDB, authentication, AI integration, coding practice, project verification")
    doc.add_page_break()

    add_contents_page(doc)
    heading(doc, "List of Figures", 1)
    bullets(doc, [
        "Figure 1. Active system architecture and request flow",
        "Figure 2. Data ownership and persistence relationships",
        "Figure 3. Career assistant request and provider sequence",
        "Figure 4. Assessment session and scoring sequence",
        "Figures 5–9. Reserved product screenshots (not captured)",
    ])
    heading(doc, "List of Tables", 1)
    bullets(doc, [
        "Table 1. Project objectives and completion evidence",
        "Table 2. Technology stack and responsibilities",
        "Table 3. Fifteen user-facing modules and verification boundaries",
        "Table 4. Data entities and ownership",
        "Table 5. API surface summary",
        "Table 6. Automated verification results",
        "Table 7. Known limitations and recommended next work",
    ])
    heading(doc, "Acronyms", 1)
    table(doc, ["Acronym", "Meaning"], [
        ("AI", "Artificial Intelligence"),
        ("API", "Application Programming Interface"),
        ("ATS", "Applicant Tracking System"),
        ("CRUD", "Create, Read, Update, Delete"),
        ("JWT", "JSON Web Token"),
        ("MCQ", "Multiple-Choice Question"),
        ("NLP", "Natural Language Processing"),
        ("REST", "Representational State Transfer"),
        ("UI", "User Interface"),
        ("VM", "Virtual Machine"),
    ], [1.4, 5.3])
    doc.add_page_break()

    # Chapter 1
    heading(doc, "Chapter 1 — Introduction", 1)
    heading(doc, "1.1 Background", 2)
    paragraph(doc, "Students preparing for placements often coordinate career profiles, assessments, skills practice, interview preparation, resumes, job opportunities, and application tracking across separate services. CareerHub AI brings these workflows together in one authenticated web application while retaining boundaries between deterministic product calculations and optional AI-generated guidance.")
    heading(doc, "1.2 Problem statement", 2)
    paragraph(doc, "A candidate needs a coherent view of preparation progress and a set of practical workflows that connect profile information to assessments, skill development, interview rehearsal, coding practice, and job discovery. A product that presents AI output without confirming provider availability, invents scores, or confuses an external redirect with an application submission would be unreliable. The system therefore needs explicit ownership, persistence, provider-error handling, and evidence-based status reporting.")
    heading(doc, "1.3 Objectives", 2)
    bullets(doc, [
        "Provide authenticated profile and target-role workflows used across career features.",
        "Offer assessment, coding, interview, resume, job-analysis, roadmap, and planning workflows.",
        "Persist appropriate user-owned data and isolate it by authenticated account.",
        "Integrate optional AI assistance through server-side provider configuration.",
        "Distinguish provider-generated content from curated or deterministic application behavior.",
        "Validate job destinations and keep application tracking separate from external application submission.",
        "Test functional behavior and report provider, UI, and external-service limitations honestly.",
    ])
    heading(doc, "1.4 Scope", 2)
    paragraph(doc, "The report covers the currently active Express-served application, its static frontend, backend routes, persistence models, AI service, coding catalog and sandbox, and the automated checks run for this document. It does not claim that every external provider, live feed, UI path, browser width, or production deployment has been end-to-end verified.")
    heading(doc, "1.5 Objectives and evidence", 2)
    table(doc, ["Objective", "Implementation evidence", "Verification boundary"], [
        ("Authenticated career workflows", "JWT middleware, profile routes, user-owned models", "API suite exercises registration, profile, authentication, and ownership cases."),
        ("Practice and assessment", "Career routes, interview/coding routes, models", "Unit and API tests cover deterministic scoring, sandbox examples, and persistence paths."),
        ("AI-assisted guidance", "Shared Gemini/OpenRouter service and consuming routes", "Mocked adapter tests pass; live generation is blocked/unverified."),
        ("Job discovery and tracking", "Arbeitnow provider utility and owner-scoped application routes", "Provider normalization/link safety tested; external feed was not live-validated here."),
        ("Usable responsive UI", "Static pages and shared styles/navigation", "Build checker parses scripts; browser visual verification was not performed."),
    ], [1.45, 2.7, 2.65])

    # Chapter 2
    heading(doc, "Chapter 2 — Requirements and Methodology", 1)
    heading(doc, "2.1 Functional requirements", 2)
    numbered(doc, [
        "Create accounts, authenticate users, and edit career profiles.",
        "Show readiness, assessment, coding, interview, and roadmap progress.",
        "Generate or select questions, accept answers, calculate results, and preserve attempt history.",
        "Browse curated coding problems, run supported JavaScript submissions against sandbox tests, and record results.",
        "Upload a text-based PDF or paste resume text for analysis when a provider is available.",
        "Discover jobs from an external feed, filter and match available attributes, and track selected listings.",
        "Create plans, update task completion, manage application statuses, and review analytics.",
        "Send contextual assistant messages, retrieve owner history, and clear that history.",
    ])
    heading(doc, "2.2 Non-functional requirements", 2)
    bullets(doc, [
        "Keep credentials server-side and avoid returning secrets or raw internal diagnostics in user-facing responses.",
        "Authorize user-owned records through the authenticated identity.",
        "Validate inputs, external URLs, generated structured output, and sandbox inputs.",
        "Return explicit provider, missing-configuration, timeout, malformed-output, and other failure states.",
        "Preserve a usable development mode while clearly identifying its nonpersistent in-memory data.",
        "Keep the application maintainable within the repository's existing Express and static-page structure.",
    ])
    heading(doc, "2.3 Development and verification method", 2)
    paragraph(doc, "The report was prepared from an implementation audit, repository documentation, and direct execution of the root npm scripts. The pre-existing worktree contained numerous modifications before report creation; those were preserved. The report adds only a report-generation script and its DOCX output. No application source, existing user record, or environment file was changed. The API test suite used its isolated test database.")
    heading(doc, "2.4 Technology stack", 2)
    table(doc, ["Layer", "Technology evidenced", "Responsibility"], [
        ("Runtime / API", "Node.js, Express", "HTTP server, static-file delivery, route mounting, middleware."),
        ("Active frontend", "HTML, CSS, browser JavaScript", "Multi-page client served from the repository's frontend directory."),
        ("Data access", "Mongoose / MongoDB", "Schemas and persistence when MongoDB is connected."),
        ("Development fallback", "In-memory model wrappers", "Process-local operation when MongoDB is unavailable; data is not durable."),
        ("Authentication", "bcryptjs, JSON Web Token", "Password hashing, bearer-token issuance and validation."),
        ("AI providers", "Google Gemini API; OpenRouter chat completions", "Optional server-side generation, evaluation, and analysis."),
        ("Code practice", "JavaScript sandbox using vm2", "Test-case execution for supported local coding submissions."),
        ("Static analysis", "Repository build-check script", "Parses JavaScript and inline page scripts as build/lint validation."),
    ], [1.3, 2.25, 3.25])
    note_box(doc, "Active application clarification", "The backend serves the static multi-page frontend. A separate root Vite/React scaffold exists, but the inspected root package does not declare React/Vite dependencies and its root HTML references a missing src/main.tsx. It is not the active application entrypoint described by this report.")

    # Chapter 3
    heading(doc, "Chapter 3 — System Analysis and Design", 1)
    heading(doc, "3.1 Architecture", 2)
    paragraph(doc, "The active system uses a browser-to-Express architecture. The frontend calls JSON endpoints, bearer-token middleware identifies the account, route handlers validate and apply business rules, Mongoose models persist owner-scoped records, and the shared AI service makes optional external provider calls.")
    table(doc, ["Browser / static client", "Express API and middleware", "Data / external services"], [
        ("HTML pages + shared CSS/JS\nforms, status, filters, charts", "Routes + auth middleware\nvalidation + calculations\nprovider error mapping", "MongoDB / Mongoose\nuser-owned records\nin-memory dev fallback"),
        ("Fetch API + bearer JWT\nresponse rendering", "AI service\nGemini OR OpenRouter\nno silent fallback", "External AI APIs\nArbeitnow job feed\nLeetCode official destinations"),
    ], [2.25, 2.25, 2.25])
    caption(doc, "Figure 1. Active system architecture and request flow. The table diagram represents only the inspected active static-client/Express path.")
    heading(doc, "3.2 Request flow", 2)
    numbered(doc, [
        "The browser loads a page from the Express-served frontend directory.",
        "A page or shared API client sends a request to an Express route.",
        "Authentication middleware validates the bearer JWT for protected operations.",
        "The route validates input and uses the authenticated user ID for user-owned records.",
        "Deterministic application logic computes results; AI-dependent paths call the configured provider service.",
        "The route validates provider output or maps provider errors to explicit API errors.",
        "Successful data is persisted through MongoDB models when connected and returned to the frontend.",
    ])
    heading(doc, "3.3 Data ownership model", 2)
    table(doc, ["Relationship", "Meaning"], [
        ("User 1 — many CareerConversation messages", "Conversation is account-scoped; history/clear operations require the owner."),
        ("User 1 — many CareerAssessmentSession records", "Question set, active answer key, answers, and result belong to the candidate."),
        ("User 1 — many Interview / ExamSession records", "Practice sessions, answers, scores, and feedback belong to the candidate."),
        ("User 1 — many ResumeAnalysis / SkillGapAnalysis records", "Analysis history is stored under the authenticated account."),
        ("User 1 — many JobApplication records", "Tracked listings and status are user-specific."),
        ("User 1 — many CareerRoadmap / DailyPlan / CodeSubmission records", "Progress and submissions are account-specific."),
        ("Shared CodingProblem / Challenge catalog", "Catalog entries are shared; hidden test data is not exposed as public listing data."),
        ("JobOpportunity feed records", "Live provider records are external listing data, not an account's private history."),
    ], [2.7, 4.05])
    caption(doc, "Figure 2. Data ownership and persistence relationships, summarized from Mongoose models and route ownership checks.")
    heading(doc, "3.4 Data model inventory", 2)
    table(doc, ["Model", "Purpose", "Ownership / notes"], [
        ("User", "Account, profile, target role, authentication fields", "Unique account identity; password stored as hash."),
        ("CareerAssessment / CareerAssessmentSession", "Assessment definitions and attempts", "Attempt is user-associated; answer keys protected until submission."),
        ("Interview / ExamSession", "Interview and exam practice records", "User-associated session and result data."),
        ("CareerConversation", "Assistant conversation history", "Owner-scoped read and clear operations."),
        ("CareerRoadmap / DailyPlan", "Roadmap milestones and daily task progress", "User-specific and persistent with MongoDB."),
        ("JobApplication", "Tracked opportunity and status", "Owner-scoped; duplicate prevention is covered by tests."),
        ("ResumeAnalysis / SkillGapAnalysis", "Analysis results and history", "Stored per user after successful analysis."),
        ("CodingProblem / Challenge", "Shared practice catalog", "Seed process is tested for idempotence; 16 distinct catalog items."),
        ("CodeSubmission", "Coding attempt outcome and history", "Owner-scoped submission history."),
        ("JobOpportunity", "Job listing representation", "Provider-derived listing data; distinct from tracking ownership."),
    ], [1.8, 2.45, 2.5])
    heading(doc, "3.5 API surface", 2)
    table(doc, ["Route group", "Representative responsibilities"], [
        ("/api/auth", "Registration, login, and profile access/update."),
        ("/api/career", "Overview, assistant status/history/chat, assessment, opportunities, skill gap, resources, roadmap, applications, daily plan, job analyzer, readiness, analytics, recommendations."),
        ("/api/coding", "Problem catalog, code run, hint/review, submission, history, and statistics."),
        ("/api/interview", "Question generation/evaluation, interview session, exam, and history flows."),
        ("/api/resume", "Resume history, PDF upload analysis, and pasted-text analysis."),
        ("/api/video", "Interview recording upload/file paths."),
        ("/api/user", "Profile, export, leaderboard, and LeetCode lookup."),
        ("/api/challenge", "Daily challenge and submission."),
        ("/api/admin", "Administrative user/interview views."),
    ], [1.45, 5.3])
    heading(doc, "3.6 Assistant sequence", 2)
    table(doc, ["Step", "Actor", "Action / boundary"], [
        ("1", "Browser", "Sends message with authenticated bearer token."),
        ("2", "Express", "Validates authentication and request; resolves the user's history/profile."),
        ("3", "AI service", "Selects configured Gemini, otherwise configured OpenRouter; includes context."),
        ("4", "Provider", "Returns generated output or a provider error."),
        ("5", "Express", "Validates output; persists messages to the owner conversation or returns explicit error."),
        ("6", "Browser", "Displays response/status; history can be reloaded or cleared for that owner."),
    ], [0.55, 1.2, 5.0])
    caption(doc, "Figure 3. Career assistant request and provider sequence.")
    heading(doc, "3.7 Assessment sequence", 2)
    table(doc, ["Step", "System behavior"], [
        ("Start", "Creates an assessment attempt for the authenticated user and selects AI-generated validated questions or a clearly identified curated set."),
        ("Present", "Returns question text and options without disclosing correct answers."),
        ("Submit", "Associates answers with the server-side attempt and computes score deterministically."),
        ("Persist", "Stores attempt and result under the account; answer keys remain server-side."),
        ("Review", "Returns result, explanations, and category performance after submission."),
    ], [1.0, 5.75])
    caption(doc, "Figure 4. Assessment session and scoring sequence.")

    # Chapter 4
    heading(doc, "Chapter 4 — Implementation", 1)
    heading(doc, "4.1 User-facing modules", 2)
    modules = [
        ("1. Dashboard / overview", "Displays readiness and account progress from career data.", "API page routes verified; no visual browser review."),
        ("2. Profile and target role", "Stores the candidate's profile and canonical target role.", "Profile validation and role-resolution tests; API profile flow."),
        ("3. Career assessment", "Supports validated AI question generation where available, curated questions, protected answer keys, deterministic scoring, and attempts.", "Scoring and persistence covered; live AI generation blocked."),
        ("4. Skill-gap analysis", "Compares self-reported skills to curated role benchmarks; optional AI explanations.", "Deterministic profile/role logic present; live AI blocked."),
        ("5. Career roadmap", "Maintains user-specific milestones; AI generation when available and curated starter path otherwise.", "Persistence paths covered by API suite; provider output not live-verified."),
        ("6. Daily plan", "Builds tasks from a fixed task template and available coding content; records completion/progress.", "API tests generated tasks and updated completion."),
        ("7. Coding practice", "Serves a curated catalog, supports search/filter, local JavaScript execution, and AI hint/review endpoints.", "16 unique entries; ten new examples executed; AI endpoints blocked."),
        ("8. Interview practice", "Supports MCQ and conversational/video-oriented session flows and user-owned history.", "History and curated fallback tested; runtime AI generation blocked."),
        ("9. Resume analyzer", "Accepts text-based PDF or pasted text, validates/extracts text, and stores successful analysis history.", "PDF extraction/validation and ownership tested; AI analysis blocked."),
        ("10. Job-description analyzer", "Computes recognized role/skill overlap and can add provider-generated guidance.", "Endpoint exercised; AI augmentation blocked."),
        ("11. Job matching / opportunities", "Fetches provider listings, applies profile matching and filters, and validates external link safety.", "Normalization and URL-safety tests; external live feed not proven by this run."),
        ("12. Application tracking", "Tracks a selected listing and application status for the signed-in user.", "Ownership, duplicate, and cross-user cases exercised in API suite."),
        ("13. Readiness and analytics", "Calculates readiness from stored profile/activity and renders analytics views.", "API readiness and analytics routes tested; charts not visually reviewed."),
        ("14. Learning resources", "Offers a directory of external learning resources and role-related suggestions.", "Routes exist; AI-based selection is provider-dependent."),
        ("15. Career assistant and recommendations", "Supports personalized chat/history/clear and career recommendations.", "History ownership/clear tested; genuine AI generation blocked."),
    ]
    table(doc, ["Module", "Implemented behavior", "Evidence / limit"], modules, [1.45, 2.9, 2.4], 8)
    heading(doc, "4.2 Authentication and authorization", 2)
    paragraph(doc, "Registration hashes passwords with bcrypt. Login issues a bearer JWT; protected routes validate the token and load the authenticated account. User-owned histories and records are queried using that account identity. The isolated API suite tested registration/login, unauthenticated requests, persistence across a new login, and cross-user isolation for assistant history, resume history, and tracked provider jobs.")
    heading(doc, "4.3 Persistence and development mode", 2)
    paragraph(doc, "Mongoose-backed models are used when MongoDB is connected. The isolated API suite reported a MongoDB connection and exercised durable account-scoped reads and writes in its test environment. When MongoDB is unavailable, the repository can use an in-memory model layer. That fallback is process-local and must not be presented as durable storage.")
    heading(doc, "4.4 AI provider integration", 2)
    paragraph(doc, "A shared backend service chooses Gemini when GEMINI_API_KEY is configured. If Gemini is absent, it can use OpenRouter when OPENROUTER_API_KEY is configured. Provider failures do not silently switch providers. Request output is parsed and validated for the expected feature schema, and provider error categories include missing configuration, authentication, quota, rate limits, timeouts, invalid model, malformed output, and upstream errors.")
    table(doc, ["Provider fact", "Evidence / status"], [
        ("Credential handling", "Keys are configured server-side through environment variables; this report does not include values."),
        ("Configured selection", "Gemini takes priority; OpenRouter is selected only when Gemini is absent."),
        ("Mocked provider coverage", "Unit tests validate request mapping, parsing, error mapping, and timeouts using mocks."),
        ("Isolated API run", "Provider keys were intentionally unavailable to the test process; AI routes returned explicit not-configured errors."),
        ("Genuine request", "Prior genuine Gemini request returned AI_PROVIDER_AUTH_ERROR; no successful model output was obtained."),
        ("Current conclusion", "Real provider generation is BLOCKED / UNVERIFIED. A valid provider credential and one controlled request are required."),
    ], [1.7, 5.05])
    note_box(doc, "No fabricated output", "A missing provider or failed request is returned as an explicit error. The automated test evidence does not establish genuine model generation.")
    heading(doc, "4.5 Job matching and application tracking", 2)
    paragraph(doc, "The job utility normalizes provider listings and validates URL schemes. The README identifies the public Arbeitnow Job Board API as the current listing source, requested by the backend on load, with attribution to the source listing and no salary shown when absent. Matching is deterministic: technical-skill overlap, target-role/title overlap, and preferred-location compatibility are weighted 60%, 30%, and 10%; missing dimensions are excluded and remaining weights normalized. This is an application-defined score, not a provider or AI score. Tracking is a separate owner-scoped action; opening an external link does not submit an application.")
    paragraph(doc, "The report's automated evidence verifies normalization, safe URLs, matching behavior, empty provider data, failures, and account ownership. It does not establish that the external feed was reachable at report time or that any particular listing remains open.")
    heading(doc, "4.6 Coding catalog and sandbox", 2)
    paragraph(doc, "The catalog contains 16 distinct curated entries. Six have title/slug mappings to official LeetCode destinations; ten are original CareerHub challenges and should not be represented as LeetCode problems. The seed tests report uniqueness and idempotence. Catalog tests validate existing link mapping and safe original entries. The API suite executed local sample inputs in the existing JavaScript sandbox, including the ten additional problem examples. Local accepted status means the configured sandbox tests passed; it is not a submission to a LeetCode account.")
    paragraph(doc, "A direct documentation lookup of LeetCode's public problem-set page returned HTTP 403 in this environment. This is an access restriction on the verification request and is not evidence that the catalog's mapped URLs are invalid.")
    heading(doc, "4.7 Resume processing", 2)
    paragraph(doc, "The resume flow supports PDF upload and pasted text. Unit tests confirm text extraction returns content and reject malformed or image-only PDFs rather than fabricating a score. A successful analysis depends on the configured provider and validated structured output; the isolated API suite returned an explicit provider-not-configured status. Therefore successful AI analysis and generated ATS/readability results are not verified in this report.")
    heading(doc, "4.8 Security and reliability controls", 2)
    table(doc, ["Control", "Observed implementation / test evidence"], [
        ("Password handling", "bcrypt password hashing; registration/login acceptance tests."),
        ("Authentication", "Bearer JWT middleware; unauthenticated protected requests return unauthorized."),
        ("Record ownership", "Owner-scoped queries; integration checks for assistant, resume, and job data isolation."),
        ("Answer-key protection", "Assessment scoring tests verify answer keys remain server-side until submission."),
        ("External URL safety", "Job provider tests reject unsafe schemes and validate attribution/link fields."),
        ("AI failures", "Provider error tests cover missing keys, auth, quota, rate limit, timeout, model, malformed output."),
        ("Coding execution", "Existing bounded sandbox; API suite verifies example execution and saved user history."),
        ("Secrets", "No credential values were printed or inserted into report output."),
    ], [1.65, 5.1])

    # Chapter 5
    heading(doc, "Chapter 5 — Testing and Results", 1)
    heading(doc, "5.1 Test environment and scope", 2)
    paragraph(doc, "Verification commands were run from the repository root in the Windows development environment. The API suite started a separate test server on port 3321, reported a MongoDB connection, and used its isolated test workflow. AI-dependent test-server credentials were disabled so the suite would not consume provider quota. The repository already contained unrelated modified and untracked files; they were not reverted.")
    heading(doc, "5.2 Command results", 2)
    table(doc, ["Command", "Actual result", "Interpretation"], [
        ("npm test", "PASS. All 11 configured unit-test programs passed.", "Includes mocked Gemini/OpenRouter tests, assessment scoring, interview workflows, job provider, resume PDF, role/profile validation, coding catalog, provider errors, and assistant rendering."),
        ("npm run lint", "PASS. Build checks parsed 67 JavaScript files and 41 inline page scripts.", "Repository build-check validation; not a full browser compatibility or visual lint suite."),
        ("npm run build", "PASS. Same build-check command parsed 67 JavaScript files and 41 inline page scripts.", "The package script maps build to backend/build-check.js; no separate Vite production bundle was produced."),
        ("npm run test:api", "98 passed, 0 failed, 11 blocked of 109 checks. Process exit code 2 because blocked checks remain.", "Blocked items are provider-dependent; not failures and not successful AI generation."),
    ], [1.25, 2.1, 3.4], 8)
    heading(doc, "5.3 Selected API acceptance evidence", 2)
    bullets(doc, [
        "Health endpoint, authentication requirements, registration/login, profile target role, readiness, daily-plan creation, and task update passed.",
        "Coding sandbox returned a sample execution result; catalog uniqueness, safe LeetCode links, search/filters, ten additional sample executions, and owner-scoped submission history passed.",
        "Assistant and resume API flows correctly returned AI_PROVIDER_NOT_CONFIGURED when the isolated process had no provider key; no fake generation result was returned.",
        "Resume history survived a fresh login; a second account could not read it. Assistant history was owner-scoped, could not be cleared by a second account, and was cleared by its owner.",
        "Tracked provider jobs were not visible to a second account; unauthenticated application access was rejected.",
        "Nineteen dedicated page URLs returned HTTP success in the API suite. This checks page responses only, not visual layout or interactive browser behavior.",
    ])
    heading(doc, "5.4 AI verification distinction", 2)
    table(doc, ["Evidence category", "Result"], [
        ("Mocked unit provider tests", "PASS — request formatting, response parsing, output validation, and error mapping tested with mocks."),
        ("No-key behavior", "PASS — API returns an explicit not-configured error rather than a fabricated response."),
        ("Genuine Gemini request", "BLOCKED — a prior actual request returned AI_PROVIDER_AUTH_ERROR; no successful output."),
        ("Genuine OpenRouter request", "NOT VERIFIED in this report; no successful response evidence was produced."),
        ("AI features end-to-end", "BLOCKED — do not claim resume, assistant, assessment-generation, interview, hints/reviews, or AI recommendations work with real model output."),
    ], [2.0, 4.75])
    heading(doc, "5.5 Browser and visual verification", 2)
    paragraph(doc, "No authenticated browser session, browser automation run, or saved genuine screenshot was available for this report. Accordingly, the report does not claim visual verification at 390 px, 768 px, 1366 px, or 1440 px, nor does it claim console/network inspection or completion of manual UI workflows.")
    for name, purpose in [
        ("Dashboard and navigation", "Capture after a verified test-account login; preserve the real UI and remove no evidence."),
        ("Career assessment", "Capture actual question, submission, and result states after verifying server-side scoring."),
        ("Interview Studio", "Capture actual practice modes and a real session state; do not portray a provider result unless generated."),
        ("Coding Practice", "Capture problem details, local sandbox result, and the official link label."),
        ("Career Assistant", "Capture provider-unavailable state or genuine provider response accurately; never substitute sample output."),
    ]:
        add_screenshot_placeholder(doc, name, purpose)
    heading(doc, "5.6 Test case summary", 2)
    table(doc, ["Area", "Result", "Evidence level"], [
        ("Unit/business logic", "Passed", "Automated; AI adapter calls mocked."),
        ("API/auth/data ownership", "98 passed, 0 failed, 11 blocked", "Automated; isolated test server and MongoDB connection reported."),
        ("Page HTTP responses", "19 page URLs passed", "API acceptance check; no visual browser assertions."),
        ("Real AI provider", "Not passed", "Gemini auth error in prior genuine attempt; current test server had keys disabled."),
        ("Live job feed reachability", "Not established", "Provider adapter tested; this run did not confirm external feed availability."),
        ("Responsive visual behavior", "Not tested", "Requires browser testing and actual screenshots."),
    ], [1.8, 2.1, 2.85])

    # Chapter 6
    heading(doc, "Chapter 6 — Discussion, Limitations, and Future Work", 1)
    heading(doc, "6.1 Strengths evidenced by tests", 2)
    bullets(doc, [
        "Explicit provider error handling and no false AI-success response when keys are missing.",
        "Account-scoped conversation, resume, tracked-job, and submission flows with cross-user tests.",
        "Server-side assessment scoring and answer-key protection.",
        "Coding catalog uniqueness/idempotence checks and executable local examples.",
        "Consistent role resolution, input/link checks, and focused regression tests.",
    ])
    heading(doc, "6.2 Known limitations", 2)
    table(doc, ["Limitation", "Current evidence / impact"], [
        ("Real model access", "Prior Gemini request returned an authentication error; real generation is not verified. Configure a valid server-side provider key and re-test."),
        ("No browser screenshots", "Visual polish, navigation interactions, console errors, and responsive widths remain unverified."),
        ("External job feed", "Adapter and schema logic are tested; feed uptime/current listing validity are not guaranteed by this run."),
        ("Catalog size", "Only 16 curated definitions are present; six link to verified LeetCode mappings and ten are original challenges."),
        ("Assessment coverage", "Curated category/difficulty/session-length support is intentionally finite; unsupported combinations may be unavailable."),
        ("In-memory mode", "Data is lost on restart; durable account data requires MongoDB."),
        ("Separate scaffold", "The root Vite/React scaffold appears incomplete and differs from the active Express-served frontend."),
        ("UI acceptance", "Automated syntax and HTTP checks do not substitute for visual and interaction testing."),
    ], [1.6, 5.15])
    heading(doc, "6.3 Recommended next steps", 2)
    numbered(doc, [
        "Have the project owner provision a valid Gemini or OpenRouter credential, store it only in the backend environment, and run one small genuine request for each AI feature; document sanitized provider status and output evidence.",
        "Run browser-based workflows with a dedicated test account and isolated database; capture unmodified screenshots at 390, 768, 1366, and 1440 px.",
        "Verify actual external job feed response and current official destinations without presenting network failures as invalid links.",
        "Decide whether the incomplete root React/Vite scaffold should be repaired or removed in a separate, approved task; do not confuse it with the active static frontend.",
        "Expand the coding catalog only with reviewed, unique problem definitions and verifiable official destinations.",
        "Complete institution-specific cover, certificate, declaration, guide, and approval details before academic submission.",
    ])

    # Chapter 7
    heading(doc, "Chapter 7 — Conclusion", 1)
    paragraph(doc, "CareerHub AI is an implemented multi-page career-preparation application with an Express API, authenticated user workflows, Mongoose persistence, deterministic readiness and assessment logic, a curated coding catalog and local sandbox, owner-scoped history, external job-feed integration, and optional Gemini/OpenRouter AI services.")
    paragraph(doc, "For this report, the repository unit suite and build/lint checks passed; the API suite recorded 98 passed, 0 failed, and 11 blocked checks. The blocked cases are significant: provider keys were unavailable in the isolated test process, and a prior genuine Gemini request returned an authentication error. The evidence therefore supports core deterministic and API behaviors but does not establish successful real AI generation, a live job-feed response at the time of writing, or browser-level visual quality.")
    paragraph(doc, "The project is suitable for continued demonstration and verification after provider configuration and browser acceptance testing. It should not be described as fully AI-verified or visually production-ready until those external and UI checks have been completed.")

    # Appendices
    heading(doc, "Appendix A — Reproducible local setup", 1)
    numbered(doc, [
        "Install a supported Node.js version and dependencies from the repository root with: npm install.",
        "Configure environment variables using the names and descriptions in .env.example. Do not commit .env or disclose secret values.",
        "Configure MongoDB for persistent account data. If MongoDB is unavailable, the development in-memory fallback is not durable.",
        "For genuine AI, configure either GEMINI_API_KEY or OPENROUTER_API_KEY on the backend; Gemini takes precedence when both are set.",
        "Start the application with: npm run dev. The documented default is http://localhost:3000.",
        "Use a fresh account and avoid production user data when exercising mutation flows.",
    ])
    paragraph(doc, "Commands executed for this report: npm test; npm run lint; npm run build; npm run test:api. The API suite used a separate test server and isolated test workflow. Its blocked count is preserved in the reported result.")
    heading(doc, "Appendix B — Configuration names (values omitted)", 1)
    table(doc, ["Variable", "Purpose", "Reporting note"], [
        ("MONGO_URI / MONGODB_URI", "MongoDB connection", "No value included."),
        ("JWT_SECRET", "JWT signing secret", "No value included; use a high-entropy secret in production."),
        ("GEMINI_API_KEY", "Gemini server-side credential", "No value included; prior real request returned auth error."),
        ("GEMINI_MODEL", "Optional Gemini model selection", "Model output not verified."),
        ("OPENROUTER_API_KEY", "Alternative server-side credential", "No value included; not genuinely verified here."),
        ("OPENROUTER_MODEL", "OpenRouter model slug", "Must be available to the configured account."),
        ("PORT", "HTTP listener port", "Defaults to 3000 in documentation."),
    ], [1.75, 2.7, 2.3])
    heading(doc, "Appendix C — Screenshot capture checklist", 1)
    bullets(doc, [
        "Use only an authorized test account and avoid real personal or employer data.",
        "Capture the actual page from the running app; retain the route and viewport in a note.",
        "Do not replace an unavailable provider response with a mock answer in a screenshot.",
        "Record whether visible content is curated, deterministic, provider-generated, or external.",
        "Update the screenshot placeholders in Chapter 5 only after the actual workflow has been verified.",
    ])

    # References
    heading(doc, "References", 1)
    paragraph(doc, f"External references below point to official documentation or the service's own published API documentation. Repository-specific claims are based on the inspected implementation and automated command outputs described in Chapter 5. Access date: {ACCESS_DATE}.")
    references = [
        ("Express.js API and application framework documentation", "OpenJS Foundation", "https://expressjs.com/"),
        ("Node.js documentation", "OpenJS Foundation", "https://nodejs.org/docs/latest/api/"),
        ("MongoDB Manual", "MongoDB, Inc.", "https://www.mongodb.com/docs/manual/"),
        ("Mongoose documentation", "Mongoose project", "https://mongoosejs.com/docs/"),
        ("JSON Web Token introduction", "Auth0", "https://jwt.io/introduction"),
        ("Google Gemini API documentation", "Google AI for Developers", "https://ai.google.dev/gemini-api/docs"),
        ("OpenRouter API reference", "OpenRouter", "https://openrouter.ai/docs/api-reference/overview"),
        ("Arbeitnow Job Board API documentation", "Arbeitnow", "https://www.arbeitnow.com/blog/job-board-api"),
        ("LeetCode problem set", "LeetCode", "https://leetcode.com/problemset/"),
        ("CareerHub AI project README", "Repository documentation", "https://github.com/2303a52074/carrerhub-ai"),
    ]
    for index, (title, organization, url) in enumerate(references, 1):
        add_reference(doc, index, title, organization, url, f"Accessed {ACCESS_DATE}")
    paragraph(doc, "Note: The repository URL is included as a project locator. No specific commit, release, or public deployment was independently verified for this report.")
    heading(doc, "Repository implementation sources", 2)
    table(doc, ["Source file", "Report evidence"], [
        ("backend/server.js", "Express startup, API mounts, frontend static directory, MongoDB and model setup."),
        ("backend/middleware/authMiddleware.js", "Bearer-token authentication and user loading."),
        ("backend/routes/authRoutes.js", "Registration, login, and profile routes."),
        ("backend/routes/careerRoutes.js", "Assessment, assistant, job, roadmap, application, daily-plan, readiness, and analytics flows."),
        ("backend/routes/codingRoutes.js", "Catalog, sandbox run/submit, AI hint/review, and coding history."),
        ("backend/routes/interviewRoutes.js", "Interview generation, evaluation, session, and history."),
        ("backend/routes/resumeRoutes.js", "PDF/text analysis and resume-history flows."),
        ("backend/utils/aiService.js", "Gemini/OpenRouter selection, request parsing, and AI helper functions."),
        ("backend/utils/jobProvider.js", "External job feed normalization, link safety, and matching."),
        ("backend/utils/leetcodeCatalog.js; backend/utils/seedCodingProblems.js", "Verified catalog mapping and idempotent coding-problem seed."),
        ("backend/models/*.js", "Persisted domain entities, including account-owned records."),
        ("backend/test-*.js; backend/run-api-tests.js; package.json", "Automated unit/API tests and exact root scripts."),
    ], [2.7, 4.05])

    # Core properties and save
    doc.core_properties.title = "CareerHub AI — B.Tech Final Year Project Report"
    doc.core_properties.subject = "Implementation-grounded project report and verification results"
    doc.core_properties.author = "[STUDENT NAME]"
    doc.core_properties.keywords = "CareerHub AI, project report, career platform, verification"
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(f"Generated {OUTPUT}")
    print(f"Bytes: {OUTPUT.stat().st_size}")
    print(f"Body paragraphs: {len(doc.paragraphs)} (tables contain additional text)")
    print("Tables:", len(doc.tables))


if __name__ == "__main__":
    build()
