const mongoose = require('mongoose');
const os = require('node:os');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User } = require('../src/models/User'); // Destructure User here
const Creneau = require('../src/models/Creneau');

jest.setTimeout(60000); // first run downloads a mongod binary

let mongod;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  // Pass runtimeAdapters to fix the Jest VM / MongoDB driver client metadata issue
  await mongoose.connect(mongod.getUri(), {
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
  await expect(User.create(data)).rejects.toThrow(/duplicate key/);
});

test('same room, date and start time cannot exist twice', async () => {
  const data = { roomId: new mongoose.Types.ObjectId(), date: new Date('2026-12-15'), timeStart: '09:00', timeEnd: '12:00' };
  await Creneau.create(data);
  await expect(Creneau.create(data)).rejects.toThrow(/duplicate key/);
});

test('two simultaneous bookings: only one wins', async () => {
  const slot = await Creneau.create({
    roomId: new mongoose.Types.ObjectId(),
    date: new Date('2026-12-15'), 
    timeStart: '09:00', 
    timeEnd: '12:00',
  });
  const book = () =>
    Creneau.findOneAndUpdate({ _id: slot._id, status: 'DISPONIBLE' }, { status: 'RESERVE' }, { new: true });
  const results = await Promise.all([book(), book()]);
  expect(results.filter(Boolean)).toHaveLength(1);
});