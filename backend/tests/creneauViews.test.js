```javascript
const mongoose = require('mongoose');
const os = require('node:os');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Room = require('../src/models/Room');
const Creneau = require('../src/models/Creneau');
const Reservation = require('../src/models/Reservation');

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

const url = (path = '') => `/agent/rooms/${room._id}/creneaux${path}`;

function get(path, query) {
  return request(app).get(url(path)).query({ agentId, ...query });
}

function post(path, data) {
  return request(app).post(url(path)).type('form').send({ agentId, ...data });
}

function makeCreneau(dateText, status, reason) {
  return Creneau.create({
    roomId: room._id,
    date: new Date(dateText),
    timeStart: '00:00',
    timeEnd: '23:59',
    status: status || 'DISPONIBLE',
    blockReason: reason || '',
  });
}

function location(res) {
  return decodeURIComponent(res.headers.location);
}

test('pages without agentId are refused', async () => {
  const res = await request(app).get(url());
  expect(res.statusCode).toBe(401);
});

test('another agent cannot see the room calendar', async () => {
  const other = new mongoose.Types.ObjectId().toString();
  const res = await request(app).get(url()).query({ agentId: other });
  expect(res.statusCode).toBe(403);
});

test('calendar page has the top bar, the room name, the month and the legend', async () => {
  const res = await get('', { month: '2030-01' });

  expect(res.statusCode).toBe(200);
  expect(res.text).toContain('Tableau de bord');
  expect(res.text).toContain('Mes salles');
  expect(res.text).toContain('Disponibilités · Salle Carthage');
  expect(res.text).toContain('Janvier 2030');
  expect(res.text).toContain('Non ouvert : pointillés');
  expect(res.text).toContain('Ouvrir cette date');
});

test('calendar page shows each state with its own class', async () => {
  await makeCreneau('2030-01-07');
  await makeCreneau('2030-01-08', 'BLOQUE');
  await makeCreneau('2030-01-09', 'RESERVE');

  const res = await get('', { month: '2030-01' });

  expect(res.text).toContain('class="libre ');
  expect(res.text).toContain('class="bloque ');
  expect(res.text).toContain('class="reserve ');
  expect(res.text).toContain('class="non-ouvert ');
});

test('free day panel offers to remove the date', async () => {
  await makeCreneau('2030-01-07');

  const res = await get('', {
    month: '2030-01',
    day: '2030-01-07',
  });

  expect(res.text).toContain('Lundi 7 janvier : libre');
  expect(res.text).toContain('Retirer cette date');
});

test('blocked day panel shows the reason and offers to unblock', async () => {
  await makeCreneau('2030-01-08', 'BLOQUE', 'maintenance');

  const res = await get('', {
    month: '2030-01',
    day: '2030-01-08',
  });

  expect(res.text).toContain('Mardi 8 janvier : bloqué');
  expect(res.text).toContain('Raison : maintenance');
  expect(res.text).toContain('Débloquer cette date');
});

test('open date form creates the date and goes back to the calendar', async () => {
  const res = await post('', { date: '2030-01-07' });

  expect(res.statusCode).toBe(302);
  expect(location(res)).toContain('message=Date ouverte.');
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(1);
});

test('open date form shows the past date error', async () => {
  const res = await post('', { date: '2020-01-07' });

  expect(res.statusCode).toBe(302);
  expect(location(res)).toContain("error=Date passée : impossible de l'ouvrir.");

  const page = await request(app).get(res.headers.location);

  expect(page.text).toContain('Date passée');
});

test('recurring page shows the preview then generates the dates', async () => {
  const preview = await get('/recurring', {
    startDate: '2030-01-07',
    endDate: '2030-01-13',
    days: ['1', '3', '5'],
  });

  expect(preview.statusCode).toBe(200);
  expect(preview.text).toContain('3 dates seront créées.');
  expect(preview.text).toContain('Les dates bloquées ou réservées ne sont pas modifiées.');
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(0);

  const res = await post('/recurring', {
    startDate: '2030-01-07',
    endDate: '2030-01-13',
    days: ['1', '3', '5'],
  });

  expect(res.statusCode).toBe(302);
  expect(location(res)).toContain('3 date(s) ouverte(s).');
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(3);
});

test('recurring page works with one day only', async () => {
  const res = await post('/recurring', {
    startDate: '2030-01-07',
    endDate: '2030-01-13',
    days: '1',
  });

  expect(res.statusCode).toBe(302);
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(1);
});

test('recurring page without day shows an error', async () => {
  const res = await post('/recurring', {
    startDate: '2030-01-07',
    endDate: '2030-01-13',
  });

  expect(res.statusCode).toBe(400);
  expect(res.text).toContain('Choisissez au moins un jour');
});

test('block page shows the calendar and blocks with a reason', async () => {
  await makeCreneau('2030-01-07');

  const page = await get('/block', {
    month: '2030-01',
    date: '2030-01-07',
  });

  expect(page.statusCode).toBe(200);
  expect(page.text).toContain('Raison (facultative)');
  expect(page.text).toContain('Janvier 2030');

  const res = await post('/block', {
    date: '2030-01-07',
    reason: 'maintenance',
  });

  expect(res.statusCode).toBe(302);

  const creneau = await Creneau.findOne({ roomId: room._id });

  expect(creneau.status).toBe('BLOQUE');
  expect(creneau.blockReason).toBe('maintenance');
});

test('block page shows the error when a reservation is validated that day', async () => {
  await makeCreneau('2030-01-07', 'RESERVE');

  const res = await post('/block', {
    date: '2030-01-07',
    reason: '',
  });

  expect(res.statusCode).toBe(400);
  expect(res.text).toContain(
    'Blocage impossible : une réservation est validée ce jour-là.'
  );
});

test('unblock from the calendar panel', async () => {
  await makeCreneau('2030-01-07', 'BLOQUE', 'maintenance');

  const res = await post('/2030-01-07/unblock', {});

  expect(res.statusCode).toBe(302);

  const creneau = await Creneau.findOne({ roomId: room._id });

  expect(creneau.status).toBe('DISPONIBLE');
  expect(creneau.blockReason).toBe('');
});

test('remove a free date from the calendar panel', async () => {
  await makeCreneau('2030-01-07');

  const res = await post('/2030-01-07/delete', {});

  expect(res.statusCode).toBe(302);
  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(0);
});

test('remove shows the error when a request is pending that day', async () => {
  const creneau = await makeCreneau('2030-01-07');

  await Reservation.create({
    reference: 'RES-3',
    clientId: new mongoose.Types.ObjectId(),
    roomId: room._id,
    guests: 10,
    amount: 100,
    status: 'EN_ATTENTE',
    creneaux: [creneau._id],
  });

  const res = await post('/2030-01-07/delete', {});

  expect(res.statusCode).toBe(302);
  expect(location(res)).toContain(
    'Retrait impossible : une demande est en attente, validée ou payée ce jour-là.'
  );

  expect(await Creneau.countDocuments({ roomId: room._id })).toBe(1);
});
```
