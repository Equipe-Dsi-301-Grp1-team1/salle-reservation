const mongoose = require('mongoose');
const os = require('node:os');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Room = require('../src/models/Room');
const Creneau = require('../src/models/Creneau');
const Reservation = require('../src/models/Reservation');
const creneauService = require('../src/services/creneauService');

jest.setTimeout(60000);

let mongod;
let agentId;
let room;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { runtimeAdapters: { os } });
  await Creneau.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  agentId = new mongoose.Types.ObjectId().toString();

  room = await Room.create({
    agentId,
    name: 'Salle Carthage',
    description: 'Salle de réunion à Tunis',
    address: 'Tunis',
    capacity: 50,
    pricePerHour: 100,
    isPublished: true,
  });
});

afterEach(async () => {
  await Reservation.deleteMany({});
  await Creneau.deleteMany({});
  await Room.deleteMany({});
});

function makeCreneau(dateText, status) {
  return Creneau.create({
    roomId: room._id,
    date: new Date(dateText),
    timeStart: '00:00',
    timeEnd: '23:59',
    status: status || 'DISPONIBLE',
  });
}

test('creneaux are stored in the creneaux collection', () => {
  expect(Creneau.collection.name).toBe('creneaux');
});

test('open a date creates one creneau for the whole day', async () => {
  const creneau = await creneauService.openDate(agentId, room._id, '2030-01-07');

  expect(creneau.status).toBe('DISPONIBLE');
  expect(creneau.timeStart).toBe('00:00');
  expect(creneau.timeEnd).toBe('23:59');
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(1);
});

test('open a past date is refused', async () => {
  await expect(
    creneauService.openDate(agentId, room._id, '2020-01-07')
  ).rejects.toMatchObject({
    status: 400,
    message: "Date passée : impossible de l'ouvrir.",
  });
});

test('open the same date twice is refused', async () => {
  await creneauService.openDate(agentId, room._id, '2030-01-07');

  await expect(
    creneauService.openDate(agentId, room._id, '2030-01-07')
  ).rejects.toMatchObject({ status: 409 });

  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(1);
});

test('another agent cannot open a date', async () => {
  const other = new mongoose.Types.ObjectId().toString();

  await expect(
    creneauService.openDate(other, room._id, '2030-01-07')
  ).rejects.toMatchObject({ status: 403 });
});

test('recurring dates: preview and generation use the chosen days only', async () => {
  const count = await creneauService.countRecurring(
    agentId,
    room._id,
    '2030-01-07',
    '2030-01-13',
    [1, 3, 5]
  );

  expect(count).toBe(3);

  const created = await creneauService.generateRecurring(
    agentId,
    room._id,
    '2030-01-07',
    '2030-01-13',
    [1, 3, 5]
  );

  expect(created).toBe(3);
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(3);
});

test('recurring dates do not touch blocked or reserved dates', async () => {
  await makeCreneau('2030-01-07', 'BLOQUE');
  await makeCreneau('2030-01-09', 'RESERVE');

  const created = await creneauService.generateRecurring(
    agentId,
    room._id,
    '2030-01-07',
    '2030-01-13',
    [1, 3, 5]
  );

  expect(created).toBe(1);

  expect(
    (await Creneau.findOne({ date: new Date('2030-01-07') })).status
  ).toBe('BLOQUE');

  expect(
    (await Creneau.findOne({ date: new Date('2030-01-09') })).status
  ).toBe('RESERVE');
});

test('recurring dates need at least one day and a good period', async () => {
  await expect(
    creneauService.generateRecurring(
      agentId,
      room._id,
      '2030-01-07',
      '2030-01-13',
      []
    )
  ).rejects.toMatchObject({ status: 400 });

  await expect(
    creneauService.generateRecurring(
      agentId,
      room._id,
      '2030-01-13',
      '2030-01-07',
      [1]
    )
  ).rejects.toMatchObject({ status: 400 });
});

test('block keeps the reason and unblock removes it', async () => {
  await makeCreneau('2030-01-07');

  await creneauService.blockDate(
    agentId,
    room._id,
    '2030-01-07',
    'maintenance'
  );

  let creneau = await Creneau.findOne({ roomId: room._id });

  expect(creneau.status).toBe('BLOQUE');
  expect(creneau.blockReason).toBe('maintenance');

  await creneauService.unblockDate(agentId, room._id, '2030-01-07');

  creneau = await Creneau.findOne({ roomId: room._id });

  expect(creneau.status).toBe('DISPONIBLE');
  expect(creneau.blockReason).toBe('');
});

test('block a reserved date is refused', async () => {
  await makeCreneau('2030-01-07', 'RESERVE');

  await expect(
    creneauService.blockDate(agentId, room._id, '2030-01-07', '')
  ).rejects.toMatchObject({
    status: 409,
    message: 'Blocage impossible : une réservation est validée ce jour-là.',
  });
});

test('block a date that is not open is refused', async () => {
  await expect(
    creneauService.blockDate(agentId, room._id, '2030-01-07', '')
  ).rejects.toMatchObject({ status: 404 });
});

test('unblock a date that is not blocked is refused', async () => {
  await makeCreneau('2030-01-07');

  await expect(
    creneauService.unblockDate(agentId, room._id, '2030-01-07')
  ).rejects.toMatchObject({ status: 404 });
});

test('remove a free date', async () => {
  await makeCreneau('2030-01-07');

  await creneauService.removeDate(agentId, room._id, '2030-01-07');

  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(0);
});

test('remove a reserved date is refused', async () => {
  await makeCreneau('2030-01-07', 'RESERVE');

  await expect(
    creneauService.removeDate(agentId, room._id, '2030-01-07')
  ).rejects.toMatchObject({ status: 409 });
});

test('remove a date with a pending request is refused', async () => {
  const creneau = await makeCreneau('2030-01-07');

  await Reservation.create({
    reference: 'RES-1',
    clientId: new mongoose.Types.ObjectId(),
    roomId: room._id,
    guests: 10,
    amount: 100,
    status: 'EN_ATTENTE',
    creneaux: [creneau._id],
  });

  await expect(
    creneauService.removeDate(agentId, room._id, '2030-01-07')
  ).rejects.toMatchObject({
    status: 409,
    message: 'Retrait impossible : une demande est en attente, validée ou payée ce jour-là.',
  });

  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(1);
});

test('remove a date with only a refused request is allowed', async () => {
  const creneau = await makeCreneau('2030-01-07');

  await Reservation.create({
    reference: 'RES-2',
    clientId: new mongoose.Types.ObjectId(),
    roomId: room._id,
    guests: 10,
    amount: 100,
    status: 'REFUSEE',
    creneaux: [creneau._id],
  });

  await creneauService.removeDate(agentId, room._id, '2030-01-07');

  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(0);
});

test('calendar shows the state of each day of the month', async () => {
  await makeCreneau('2030-01-07');
  await makeCreneau('2030-01-08', 'BLOQUE');
  await makeCreneau('2030-01-09', 'RESERVE');

  const calendar = await creneauService.getCalendar(
    agentId,
    room._id,
    '2030-01',
    '2030-01-08'
  );

  expect(calendar.monthLabel).toBe('Janvier 2030');
  expect(calendar.previousMonth).toBe('2029-12');
  expect(calendar.nextMonth).toBe('2030-02');

  const days = calendar.weeks.flat().filter((cell) => cell !== null);

  expect(days).toHaveLength(31);
  expect(days.find((d) => d.date === '2030-01-07').state).toBe('libre');
  expect(days.find((d) => d.date === '2030-01-08').state).toBe('bloque');
  expect(days.find((d) => d.date === '2030-01-09').state).toBe('reserve');
  expect(days.find((d) => d.date === '2030-01-10').state).toBe('non-ouvert');
  expect(calendar.weeks.every((week) => week.length === 7)).toBe(true);
  expect(calendar.selected.label).toBe('Mardi 8 janvier');
  expect(calendar.selected.stateText).toBe('bloqué');
});

test('client api lists only the available dates', async () => {
  await makeCreneau('2030-01-07');
  await makeCreneau('2030-01-08', 'BLOQUE');

  const res = await request(app).get(`/api/rooms/${room._id}/creneaux`);

  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveLength(1);
});

test('client api gives the rooms available on a date', async () => {
  await makeCreneau('2030-01-07');

  const res = await request(app).get(
    '/api/creneaux/rooms?date=2030-01-07'
  );

  expect(res.body).toEqual([room._id.toString()]);
});
