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

describe('US-33', () => {
  test('filtre par statut', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();

    await directBooking({ client, room, reference: 'RES-ATT', status: 'EN_ATTENTE' });
    await directBooking({ client, room, reference: 'RES-VAL', status: 'VALIDEE', date: '2030-01-08' });

    const res = await request(app).get(
      '/api/agent/bookings?agentId=' + agent._id + '&status=VALIDEE'
    );

    expect(res.body).toHaveLength(1);
    expect(res.body[0].reference).toBe('RES-VAL');
  });
});

describe('US-35', () => {
  test('detail complet', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, reference: 'RES-DETAIL' });

    const res = await request(app).get(
      '/api/agent/bookings/' + booking._id + '?agentId=' + agent._id
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.reference).toBe('RES-DETAIL');
    expect(res.body.client).toBe('Sarra');
  });

  test('autre agent en 404', async () => {
    const agent = await makeAgent();
    const otherAgent = await makeAgent();
    const room = await makeRoom(otherAgent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room });

    const res = await request(app).get(
      '/api/agent/bookings/' + booking._id + '?agentId=' + agent._id
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('US-37', () => {
  test('validation et verrou du jour', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const creneau = await openDay(room, '2030-01-07');
    const client = await makeClient();
    const booking = await directBooking({ client, room, creneaux: [creneau._id] });

    const res = await request(app).post(
      '/api/agent/bookings/' + booking._id + '/validate?agentId=' + agent._id
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe('VALIDEE');

    const after = await Reservation.findById(booking._id);
    const day = await Creneau.findById(creneau._id);

    expect(after.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000);
    expect(day.status).toBe('RESERVE');
  });

  test('deux validations simultanees', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const creneau = await openDay(room, '2030-01-07');
    const clientA = await makeClient('A');
    const clientB = await makeClient('B');

    const bookingA = await directBooking({ client: clientA, room, creneaux: [creneau._id] });
    const bookingB = await directBooking({ client: clientB, room, creneaux: [creneau._id] });

    const results = await Promise.all([
      request(app).post('/api/agent/bookings/' + bookingA._id + '/validate?agentId=' + agent._id),
      request(app).post('/api/agent/bookings/' + bookingB._id + '/validate?agentId=' + agent._id),
    ]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
  });
});

describe('US-38', () => {
  test('motif obligatoire', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room });

    const res = await request(app)
      .post('/api/agent/bookings/' + booking._id + '/reject?agentId=' + agent._id)
      .send({ reason: '  ' });

    expect(res.statusCode).toBe(400);
  });

  test('refus avec motif et jour libre', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const creneau = await openDay(room, '2030-01-07');
    const client = await makeClient();
    const booking = await directBooking({ client, room, creneaux: [creneau._id] });

    const res = await request(app)
      .post('/api/agent/bookings/' + booking._id + '/reject?agentId=' + agent._id)
      .send({ reason: 'Salle en travaux.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe('REFUSEE');
    expect((await Creneau.findById(creneau._id)).status).toBe('DISPONIBLE');
  });
});

describe('US-29', () => {
  test('seulement mes reservations', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const other = await makeClient('Marc');

    await directBooking({ client, room, reference: 'RES-MOI' });
    await directBooking({ client: other, room, reference: 'RES-AUTRE' });

    const res = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].reference).toBe('RES-MOI');
  });

  test('filtre par statut', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();

    await directBooking({ client, room, reference: 'RES-ATT' });
    await directBooking({ client, room, reference: 'RES-PAY', status: 'PAYEE', date: '2030-01-08' });

    const res = await request(app)
      .get('/api/bookings/me?status=PAYEE')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.body).toHaveLength(1);
    expect(res.body[0].reference).toBe('RES-PAY');
  });
});

describe('US-30', () => {
  test('detail de ma reservation', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .get('/api/bookings/' + booking._id)
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(200);
    expect(res.body.statusLabel).toBe('Validée');
    expect(res.body.room.name).toBe('Salle Carthage');
  });

  test('reservation d un autre client en 404', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const other = await makeClient('Marc');
    const booking = await directBooking({ client: other, room });

    const res = await request(app)
      .get('/api/bookings/' + booking._id)
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(404);
  });
});

describe('US-31', () => {
  test('annulation a 8 jours et jour libere', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const date = isoFromToday(8);
    const creneau = await openDay(room, date, 'RESERVE');
    const booking = await directBooking({
      client, room, date, status: 'VALIDEE', creneaux: [creneau._id],
    });
    creneau.reservationId = booking._id;
    await creneau.save();

    const res = await request(app)
      .patch('/api/bookings/' + booking._id + '/cancel')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe('ANNULEE');
    expect((await Creneau.findById(creneau._id)).status).toBe('DISPONIBLE');
  });

  test('refus a 7 jours', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, date: isoFromToday(7), status: 'VALIDEE' });

    const res = await request(app)
      .patch('/api/bookings/' + booking._id + '/cancel')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(409);
  });

  test('statut final non annulable', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'REFUSEE', date: isoFromToday(20) });

    const res = await request(app)
      .patch('/api/bookings/' + booking._id + '/cancel')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(409);
  });
});

describe('US-36', () => {
  test('historique limite aux salles de l agent', async () => {
    const agent = await makeAgent();
    const otherAgent = await makeAgent();
    const roomA = await makeRoom(agent._id, { name: 'Salle A' });
    const roomC = await makeRoom(otherAgent._id, { name: 'Salle C' });
    const client = await makeClient();

    const current = await directBooking({ client, room: roomA, reference: 'RES-COURANTE' });
    await directBooking({ client, room: roomA, reference: 'RES-PAYEE', status: 'PAYEE', date: '2029-01-07' });
    await directBooking({ client, room: roomC, reference: 'RES-AUTRE-AGENT', status: 'PAYEE', date: '2029-02-07' });

    const res = await request(app).get(
      '/api/agent/bookings/' + current._id + '?agentId=' + agent._id
    );

    expect(res.body.history.total).toBe(1);
    expect(res.body.history.paidTotal).toBe(90);
    expect(res.body.history.items[0].reference).toBe('RES-PAYEE');
  });
});

describe('US-39', () => {
  test('expiration d une validee echue', async () => {
    const { expireBookings } = require('../src/jobs/expireBookings');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const creneau = await openDay(room, '2030-01-07', 'RESERVE');
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() - 1000),
      creneaux: [creneau._id],
    });
    creneau.reservationId = booking._id;
    await creneau.save();

    const count = await expireBookings();

    expect(count).toBe(1);
    expect((await Reservation.findById(booking._id)).status).toBe('EXPIREE');
    expect((await Creneau.findById(creneau._id)).status).toBe('DISPONIBLE');
  });

  test('une payee n expire pas', async () => {
    const { expireBookings } = require('../src/jobs/expireBookings');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'PAYEE',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expireBookings();

    expect((await Reservation.findById(booking._id)).status).toBe('PAYEE');
  });
});

describe('US-40', () => {
  test('refus si non validee', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'EN_ATTENTE' });

    const res = await request(app)
      .post('/api/bookings/' + booking._id + '/pay')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(409);
  });

  test('mode demonstration', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/bookings/' + booking._id + '/pay')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(200);
    expect(res.body.mode).toBe('demo');
  });

  test('paiement demo passe a Payee', async () => {
    const Payment = require('../src/models/Payment');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/bookings/' + booking._id + '/pay/demo')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe('PAYEE');
    expect((await Payment.findOne({ bookingId: booking._id })).status).toBe('REUSSIE');
  });
});

describe('US-41', () => {
  function payload(bookingId, eventId, sessionId) {
    return JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          metadata: { bookingId: bookingId },
          amount_total: 9000,
        },
      },
    });
  }

  function signature(body) {
    const Stripe = require('stripe');
    const client = new Stripe('sk_test_123');
    return client.webhooks.generateTestHeaderString({
      payload: body,
      secret: 'whsec_test',
    });
  }

  test('evenement signe confirme le paiement', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const Payment = require('../src/models/Payment');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'VALIDEE' });
    const body = payload(booking._id.toString(), 'evt_1', 'cs_1');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature(body))
      .send(body);

    expect(res.statusCode).toBe(200);
    expect((await Reservation.findById(booking._id)).status).toBe('PAYEE');
    expect(await Payment.countDocuments({ bookingId: booking._id })).toBe(1);
  });

  test('meme evenement deux fois', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const Payment = require('../src/models/Payment');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'VALIDEE' });
    const body = payload(booking._id.toString(), 'evt_2', 'cs_2');
    const sig = signature(body);

    await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', sig)
      .send(body);
    await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', sig)
      .send(body);

    expect(await Payment.countDocuments({ bookingId: booking._id })).toBe(1);
  });

  test('signature invalide', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'VALIDEE' });
    const body = payload(booking._id.toString(), 'evt_3', 'cs_3');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=invalide')
      .send(body);

    expect(res.statusCode).toBe(400);
  });
});

describe('US-43', () => {
  test('email de nouvelle demande a l agent', async () => {
    const emailService = require('../src/services/emailService');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    await openDay(room, '2030-01-07');
    const client = await makeClient();
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send(bookingBody(room));

    const mail = spy.mock.calls.find((c) => c[0].subject.includes('Nouvelle demande'));
    expect(mail).toBeTruthy();
    expect(mail[0].to).toBe(agent.email);
  });
});

describe('US-44', () => {
  test('email de validation au client', async () => {
    const emailService = require('../src/services/emailService');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const creneau = await openDay(room, '2030-01-07');
    const client = await makeClient();
    const booking = await directBooking({ client, room, creneaux: [creneau._id] });
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await request(app).post('/api/agent/bookings/' + booking._id + '/validate?agentId=' + agent._id);

    const mail = spy.mock.calls.find((c) => c[0].subject.includes('Demande validée'));
    expect(mail).toBeTruthy();
    expect(mail[0].to).toBe(client.email);
  });
});

describe('US-45', () => {
  test('email de refus avec motif', async () => {
    const emailService = require('../src/services/emailService');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room });
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await request(app)
      .post('/api/agent/bookings/' + booking._id + '/reject?agentId=' + agent._id)
      .send({ reason: 'Salle en travaux.' });

    const mail = spy.mock.calls.find((c) => c[0].subject.includes('Demande refusée'));
    expect(mail).toBeTruthy();
    expect(mail[0].html).toContain('Salle en travaux.');
  });
});

describe('US-34', () => {
  test('filtre par salle', async () => {
    const agent = await makeAgent();
    const roomA = await makeRoom(agent._id, { name: 'Salle A' });
    const roomB = await makeRoom(agent._id, { name: 'Salle B' });
    const client = await makeClient();

    await directBooking({ client, room: roomA, reference: 'RES-A' });
    await directBooking({ client, room: roomB, reference: 'RES-B', date: '2030-01-08' });

    const res = await request(app).get(
      '/api/agent/bookings?agentId=' + agent._id + '&roomId=' + roomA._id
    );

    expect(res.body).toHaveLength(1);
    expect(res.body[0].reference).toBe('RES-A');
  });

  test('liste deroulante sur la page', async () => {
    const agent = await makeAgent();
    await makeRoom(agent._id, { name: 'Salle A' });

    const res = await request(app)
      .get('/agent/requests')
      .set('x-agent-id', agent._id.toString())
      .query({ agentId: agent._id.toString() });

    expect(res.text).toContain('Toutes mes salles');
  });
});

describe('US-42', () => {
  test('historique des paiements', async () => {
    const Payment = require('../src/models/Payment');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const other = await makeClient('Marc');

    const b1 = await directBooking({ client, room, reference: 'RES-P1', status: 'PAYEE' });
    const b2 = await directBooking({ client, room, reference: 'RES-P2', status: 'PAYEE', date: '2030-02-07' });

    await Payment.create({ bookingId: b1._id, clientId: client._id, amount: 90, status: 'REUSSIE', paidAt: new Date('2029-01-01') });
    await Payment.create({ bookingId: b2._id, clientId: client._id, amount: 90, status: 'REUSSIE', paidAt: new Date('2029-02-01') });
    await Payment.create({ bookingId: b1._id, clientId: other._id, amount: 90, status: 'REUSSIE', paidAt: new Date('2029-03-01') });

    const res = await request(app)
      .get('/api/payments/me')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(res.body).toHaveLength(2);
    expect(res.body[0].reference).toBe('RES-P2');
  });
});

describe('US-46', () => {
  test('email de paiement au client', async () => {
    const emailService = require('../src/services/emailService');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await request(app)
      .post('/api/bookings/' + booking._id + '/pay/demo')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    expect(spy.mock.calls.some((c) => c[0].subject.includes('Paiement confirmé'))).toBe(true);
  });
});

describe('US-47', () => {
  test('email de paiement a l agent', async () => {
    const emailService = require('../src/services/emailService');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await request(app)
      .post('/api/bookings/' + booking._id + '/pay/demo')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    const mail = spy.mock.calls.find((c) => c[0].subject.includes('Paiement reçu'));
    expect(mail).toBeTruthy();
    expect(mail[0].to).toBe(agent.email);
  });
});

describe('US-48', () => {
  test('email d expiration au client', async () => {
    const emailService = require('../src/services/emailService');
    const { expireBookings } = require('../src/jobs/expireBookings');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    await directBooking({
      client, room, status: 'VALIDEE',
      expiresAt: new Date(Date.now() - 1000),
    });
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await expireBookings();

    const mail = spy.mock.calls.find((c) => c[0].subject.includes('Réservation expirée'));
    expect(mail).toBeTruthy();
    expect(mail[0].to).toBe(client.email);
  });
});

describe('US-49', () => {
  test('email d annulation a l agent', async () => {
    const emailService = require('../src/services/emailService');
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'VALIDEE', date: isoFromToday(10) });
    const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValue();

    await request(app)
      .patch('/api/bookings/' + booking._id + '/cancel')
      .set('Authorization', 'Bearer ' + tokenFor(client));

    const mail = spy.mock.calls.find((c) => c[0].subject.includes('Réservation annulée'));
    expect(mail).toBeTruthy();
    expect(mail[0].to).toBe(agent.email);
  });
});

describe('US-50', () => {
  test('compteurs par statut', async () => {
    const agent = await makeAgent();
    const otherAgent = await makeAgent();
    const room = await makeRoom(agent._id);
    const otherRoom = await makeRoom(otherAgent._id);
    const client = await makeClient();

    await directBooking({ client, room, status: 'EN_ATTENTE' });
    await directBooking({ client, room, status: 'PAYEE', date: '2030-01-08' });
    await directBooking({ client, room: otherRoom, status: 'EN_ATTENTE', date: '2030-01-09' });

    const res = await request(app).get('/api/agent/dashboard?agentId=' + agent._id);

    expect(res.body.total).toBe(2);
    expect(res.body.counts.find((c) => c.status === 'EN_ATTENTE').count).toBe(1);
  });
});

describe('US-51', () => {
  test('revenus du mois', async () => {
    const agent = await makeAgent();
    const otherAgent = await makeAgent();
    const room = await makeRoom(agent._id);
    const otherRoom = await makeRoom(otherAgent._id);
    const client = await makeClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await directBooking({ client, room, status: 'PAYEE', amount: 90, date: today });
    await directBooking({ client, room, status: 'VALIDEE', amount: 60, date: today });
    await directBooking({ client, room: otherRoom, status: 'PAYEE', amount: 200, date: today });

    const res = await request(app).get('/api/agent/dashboard?agentId=' + agent._id);

    expect(res.body.revenue.monthTotal).toBe(90);
    expect(res.body.revenue.months).toHaveLength(5);
  });
});

describe('US-52', () => {
  test('avis apres reservation terminee', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'TERMINEE', date: '2025-01-07' });

    const res = await request(app)
      .post('/api/bookings/' + booking._id + '/review')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send({ rating: 5, comment: 'Très belle salle, accueil parfait.' });

    expect(res.statusCode).toBe(201);
    const updated = await Room.findById(room._id);
    expect(updated.reviewCount).toBe(1);
    expect(updated.ratingAverage).toBe(5);
  });

  test('refus si non terminee', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'PAYEE' });

    const res = await request(app)
      .post('/api/bookings/' + booking._id + '/review')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send({ rating: 5, comment: 'Excellent endroit pour travailler.' });

    expect(res.statusCode).toBe(409);
  });

  test('note hors bornes et doublon', async () => {
    const agent = await makeAgent();
    const room = await makeRoom(agent._id);
    const client = await makeClient();
    const booking = await directBooking({ client, room, status: 'TERMINEE', date: '2025-01-07' });

    const bad = await request(app)
      .post('/api/bookings/' + booking._id + '/review')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send({ rating: 6, comment: 'Commentaire assez long.' });
    expect(bad.statusCode).toBe(400);

    await request(app)
      .post('/api/bookings/' + booking._id + '/review')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send({ rating: 4, comment: 'Bonne salle, je recommande.' });

    const twice = await request(app)
      .post('/api/bookings/' + booking._id + '/review')
      .set('Authorization', 'Bearer ' + tokenFor(client))
      .send({ rating: 3, comment: 'Deuxième avis interdit.' });
    expect(twice.statusCode).toBe(409);
  });
});
