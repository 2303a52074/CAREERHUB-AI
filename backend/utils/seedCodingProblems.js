async function seedCodingProblems(model, problems) {
    await model.init();

    for (const problem of problems) {
        const seedData = { ...problem };
        delete seedData._id;
        const seedKey = `curated:${problem.id}`;
        const seeded = await model.findOne({ seedKey }).select('_id');
        if (seeded) continue;

        const legacy = await model.findOne({
            title: problem.title,
            seedKey: { $exists: false }
        }).select('_id');

        if (legacy) {
            await model.updateOne(
                { _id: legacy._id, seedKey: { $exists: false } },
                { $set: { seedKey } }
            );
            if (await model.findOne({ seedKey }).select('_id')) continue;
        }

        try {
            await model.updateOne(
                { seedKey },
                { $setOnInsert: { ...seedData, seedKey } },
                { upsert: true }
            );
        } catch (error) {
            if (error.code !== 11000 || !(await model.findOne({ seedKey }).select('_id'))) {
                throw error;
            }
        }
    }
}

module.exports = seedCodingProblems;
