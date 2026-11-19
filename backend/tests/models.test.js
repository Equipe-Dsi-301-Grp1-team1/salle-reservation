const mongoose = require('mongoose');
const os = require('node:os');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User } = require('../src/models/User'); // Destructure User here
const Creneau = require('../src/models/Creneau');

// Long timeout: on a fresh machine/CI runner, mongodb-memory-server downloads a
// mongod binary (~100MB) on first use. It is cached in ~/.cache/mongodb-binaries
// afterwards, so only the first run pays for it.
jest.setTimeout(60000);

let mongod;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), {
    // REQUIRED with mongoose >= 9.10 / mongodb driver >= 7.6 under Jest:
    // the driver's dynamic import('os') fails inside Jest's sandbox and
    // mongoose.connect() hangs until timeout (mongodb-memory-server #1026,
    // mongoose #16596). Passing the adapter explicitly fixes it on every
    // Node version, so keep this even if it seems to work without it.
    runtimeAdapters: { os },
  });
  await User.init();
  await Creneau.init(); // builds the unique indexes
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Creneau.deleteMany({});
});

test('email must be unique', async () => {
  const data = { name: 'Sarra', email: 'sarra@exemple.com', passwordHash: 'h', role: 'client', address: 'Tunis' };
  await User.create(data);
  // Match the E11000 error code (stable across MongoDB versions/locales)
  // rather than only the English "duplicate key" wording.
  await expect(User.create(data)).rejects.toThrow(/E11000|duplicate key/);
});

test('same room, date and start time cannot exist twice', async () => {
  const data = { roomId: new mongoose.Types.ObjectId(), date: new Date('2026-12-15'), timeStart: '09:00', timeEnd: '12:00' };
  await Creneau.create(data);
  await expect(Creneau.create(data)).rejects.toThrow(/E11000|duplicate key/);
});

test('two simultaneous bookings: only one wins', async () => {
  const slot = await Creneau.create({
    roomId: new mongoose.Types.ObjectId(),
    date: new Date('2026-12-15'),
    timeStart: '09:00',
    timeEnd: '12:00',
  });
  const book = () =>
    Creneau.findOneAndUpdate(
      { _id: slot._id, status: 'DISPONIBLE' },
      { status: 'RESERVE' },
      // `new: true` is deprecated by the driver; use returnDocument to avoid
      // deprecation warnings (and breakage once removed) on any machine.
      { returnDocument: 'after' }
    );
  const results = await Promise.all([book(), book()]);
  expect(results.filter(Boolean)).toHaveLength(1);
});
