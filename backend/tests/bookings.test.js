const mongoose = require('mongoose');
const os = require('node:os');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const Room = require('../src/models/Room');
const Creneau = require('../src/models/Creneau');
const Reservation = require('../src/models/Reservation');
const Review = require('../src/models/Review');
const { User, Client, Agent } = require('../src/models/User');

jest.setTimeout(60000);

let mongod;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret';
  process.env.PAYMENT_MODE = 'demo';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { runtimeAdapters: { os } });
  await Reservation.init();
  await Creneau.init();
  await Review.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.restoreAllMocks();
  const Payment = require('../src/models/Payment');
  if (Payment && Payment.deleteMany) {
    await Payment.deleteMany({});
  }
  await Review.deleteMany({});
  await Reservation.deleteMany({});
  await Creneau.deleteMany({});
  await Room.deleteMany({});
  await User.deleteMany({});
});

function unique(prefix) {
  return prefix + '-' + new mongoose.Types.ObjectId() + '@exemple.com';
}

async function makeAgent() {
  return Agent.create({
    name: 'Karim',
    email: unique('agent'),
    passwordHash: 'hash',
    phoneNumber: '22123456',
  });
}

async function makeClient(name) {
  return Client.create({
    name: name || 'Sarra',
    email: unique('client'),
    passwordHash: 'hash',
    address: 'Tunis',
  });
}

async function makeRoom(agentId, extra) {
  return Room.create({
    agentId: agentId,
    name: 'Salle Carthage',
    description: 'Salle de reunion',
    address: 'Tunis',
    capacity: 50,
    pricePerHour: 30,
    isPublished: true,
    ...extra,
  });
}

function tokenFor(user, role) {
  return jwt.sign(
    { id: user._id.toString(), role: role || 'client' },
    'test_secret'
  );
}

function openDay(room, dateText, status) {
  return Creneau.create({
    roomId: room._id,
    date: new Date(dateText),
    timeStart: '00:00',
    timeEnd: '23:59',
    status: status || 'DISPONIBLE',
  });
}

function bookingBody(room, extra) {
  return {
    roomId: room._id.toString(),
    date: '2030-01-07',
    hours: 3,
    guests: 10,
    eventType: 'Mariage',
    ...extra,
  };
}

async function directBooking(data) {
  return Reservation.create({
    reference: data.reference || 'RES-' + new mongoose.Types.ObjectId(),
    clientId: data.client._id,
    roomId: data.room._id,
    date: new Date(data.date || '2030-01-07'),
    hours: data.hours || 3,
    guests: data.guests || 10,
    eventType: data.eventType || 'Mariage',
    amount: data.amount || 90,
    status: data.status || 'EN_ATTENTE',
    expiresAt: data.expiresAt,
    rejectionReason: data.rejectionReason,
    creneaux: data.creneaux || [],
  });
}

function isoFromToday(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('US-27', () => {
  test('informations publiques de la salle', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);

    const res = await request(app).get('/api/bookings/room/' + room._id);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Salle Carthage');
    expect(res.body.pricePerHour).toBe(30);
  });

  test('salle masquee en 404', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id, { isPublished: false });

    const res = await request(app).get('/api/bookings/room/' + room._id);

    expect(res.statusCode).toBe(404);
  });
});

describe('US-28', () => {
  test('creation et montant serveur', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    await openDay(room, '2030-01-07');
    const client = await makeClient();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send(bookingBody(room, { amount: 1 }));

    expect(res.statusCode).toBe(201);
    expect(res.body.booking.amount).toBe(90);
    expect(res.body.booking.status).toBe('EN_ATTENTE');
  });

  test('le jour reste disponible', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const creneau = await openDay(room, '2030-01-07');
    const client = await makeClient();

    await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send(bookingBody(room));

    expect((await Creneau.findById(creneau._id)).status).toBe('DISPONIBLE');
  });

  test('sans jeton en 401', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);

    const res = await request(app).post('/api/bookings').send(bookingBody(room));

    expect(res.statusCode).toBe(401);
  });

  test('un agent en 403', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer ' + tokenFor(agent, 'agent'))
      .send(bookingBody(room));

    expect(res.statusCode).toBe(403);
  });

  test('jour non ouvert en 409', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send(bookingBody(room));

    expect(res.statusCode).toBe(409);
  });

  test('capacite depassee en 422', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id, { capacity: 10 });
    await openDay(room, '2030-01-07');
    const client = await makeClient();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send(bookingBody(room, { guests: 11 }));

    expect(res.statusCode).toBe(422);
  });
});

describe('US-32', () => {
  test('liste limitee aux salles de l agent', async () => {
    const agent = await makeAgent();
    const otherAgent = await makeAgent();
    const room = await makeRoom(agent._id);
    const otherRoom = await makeRoom(otherAgent._id);
    const client = await makeClient();

    await directBooking({ client, room, reference: 'RES-MIENNE' });
    await directBooking({ client, room: otherRoom, reference: 'RES-AUTRE' });

    const res = await request(app).get('/api/agent/bookings?agentId=' + agent._id);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].reference).toBe('RES-MIENNE');
  });

  test('page des demandes', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    await directBooking({ client, room, reference: 'RES-PAGE' });

    const res = await request(app)
      .get('/agent/requests')
      .set('x-agent-id', agent._id.toString())
      .query({ agentId: agent._id.toString() });

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('RES-PAGE');
  });
});
