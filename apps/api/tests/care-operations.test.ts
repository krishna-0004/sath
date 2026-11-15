import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/models/user.model.js";
import { ProfileModel } from "../src/models/profile.model.js";
import { MembershipModel } from "../src/models/membership.model.js";
import { signAccessToken } from "../src/services/token.service.js";
import { COOKIE_NAMES } from "../src/services/cookie.service.js";

describe("Phase 2 Care Operations - Medicines, Doses, Appointments, Contacts", () => {
  let mongoServer: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  let elderId: string;
  let editorId: string;
  let viewerId: string;
  let strangerId: string;

  let elderToken: string;
  let editorToken: string;
  let viewerToken: string;
  let strangerToken: string;

  let profileId: string;
  let createdMedicineId: string;
  let createdDoseId: string;
  let createdAppointmentId: string;
  let createdContactId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = createApp();

    // Create users
    const [elderUser, editorUser, viewerUser, strangerUser] = await Promise.all([
      UserModel.create({
        googleId: "google-elder",
        email: "elder@example.com",
        name: "Elder Ramesh",
      }),
      UserModel.create({
        googleId: "google-editor",
        email: "editor@example.com",
        name: "Editor Son",
      }),
      UserModel.create({
        googleId: "google-viewer",
        email: "viewer@example.com",
        name: "Viewer Daughter",
      }),
      UserModel.create({
        googleId: "google-stranger",
        email: "stranger@example.com",
        name: "Stranger User",
      }),
    ]);

    elderId = elderUser._id.toString();
    editorId = editorUser._id.toString();
    viewerId = viewerUser._id.toString();
    strangerId = strangerUser._id.toString();

    [elderToken, editorToken, viewerToken, strangerToken] = await Promise.all([
      signAccessToken(elderId),
      signAccessToken(editorId),
      signAccessToken(viewerId),
      signAccessToken(strangerId),
    ]);

    // Create profile
    const profile = await ProfileModel.create({
      elderName: "Ramesh Kumar",
      joinCode: "RAMESH1234",
      passcodeHash: "$2a$12$fakepasscodehash",
      timezone: "Asia/Kolkata",
      anchorTimes: {
        breakfast: "08:30",
        lunch: "13:30",
        dinner: "20:30",
        bedtime: "22:30",
      },
      sharing: {
        medicines: true,
        reports: true,
        appointments: true,
      },
      createdBy: elderId,
    });
    profileId = profile._id.toString();

    // Create memberships
    await Promise.all([
      MembershipModel.create({
        profileId,
        userId: elderId,
        role: "elder",
        status: "active",
      }),
      MembershipModel.create({
        profileId,
        userId: editorId,
        role: "editor",
        status: "active",
      }),
      MembershipModel.create({
        profileId,
        userId: viewerId,
        role: "viewer",
        status: "active",
      }),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("Medicines", () => {
    it("IDOR: non-member gets 404 accessing medicines", async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/medicines`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${strangerToken}`);
      expect(res.status).toBe(404);
      expect(strangerId).toBeDefined();
    });

    it("POST /api/profiles/:id/medicines creates medicine (elder or editor only)", async () => {
      // Viewer cannot create medicine
      const viewerRes = await request(app)
        .post(`/api/profiles/${profileId}/medicines`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          name: "Amlodipine",
          strengthText: "5 mg",
          frequencyText: "Once daily in morning",
          anchors: ["breakfast"],
          withFood: "after",
          notes: "Blood pressure tablet",
        });

      expect(viewerRes.status).toBe(403);
      expect(viewerRes.body.error.code).toBe("FORBIDDEN");

      // Elder can create
      const elderRes = await request(app)
        .post(`/api/profiles/${profileId}/medicines`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          name: "Metformin",
          strengthText: "500 mg",
          frequencyText: "Twice daily with meals",
          anchors: ["breakfast", "dinner"],
          withFood: "with",
          notes: "Take with food",
        });

      expect(elderRes.status).toBe(201);
      expect(elderRes.body.medicine.id).toBeDefined();
      expect(elderRes.body.medicine.name).toBe("Metformin");
      expect(elderRes.body.medicine.status).toBe("active");
      createdMedicineId = elderRes.body.medicine.id;
    });

    it("GET /api/profiles/:id/medicines returns list to viewer when shared, blocks when unshared", async () => {
      // Viewer can list
      const viewerRes = await request(app)
        .get(`/api/profiles/${profileId}/medicines`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`);

      expect(viewerRes.status).toBe(200);
      expect(viewerRes.body.medicines).toHaveLength(1);

      // Disable sharing of medicines
      await ProfileModel.findByIdAndUpdate(profileId, { "sharing.medicines": false });

      // Viewer is blocked with 404 (category unshared)
      const blockedRes = await request(app)
        .get(`/api/profiles/${profileId}/medicines`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`);

      expect(blockedRes.status).toBe(404);

      // Elder can still access
      const elderRes = await request(app)
        .get(`/api/profiles/${profileId}/medicines`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`);

      expect(elderRes.status).toBe(200);

      // Restore sharing
      await ProfileModel.findByIdAndUpdate(profileId, { "sharing.medicines": true });
    });

    it("PATCH and stop medicine", async () => {
      // Editor can update
      const patchRes = await request(app)
        .patch(`/api/profiles/${profileId}/medicines/${createdMedicineId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ strengthText: "1000 mg" });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.medicine.strengthText).toBe("1000 mg");

      // Stop medicine
      const stopRes = await request(app)
        .post(`/api/profiles/${profileId}/medicines/${createdMedicineId}/stop`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1");

      expect(stopRes.status).toBe(200);
      expect(stopRes.body.medicine.status).toBe("stopped");

      // Re-activate for dose tests
      await request(app)
        .patch(`/api/profiles/${profileId}/medicines/${createdMedicineId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ name: "Metformin" });
      await mongoose.connection
        .collection("medicines")
        .updateOne(
          { _id: new mongoose.Types.ObjectId(createdMedicineId) },
          { $set: { status: "active" } },
        );

      // 404 on non-existent medicine
      const fakeId = new mongoose.Types.ObjectId().toString();
      const notFoundPatch = await request(app)
        .patch(`/api/profiles/${profileId}/medicines/${fakeId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ name: "Ghost" });
      expect(notFoundPatch.status).toBe(404);

      const notFoundStop = await request(app)
        .post(`/api/profiles/${profileId}/medicines/${fakeId}/stop`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1");
      expect(notFoundStop.status).toBe(404);
    });
  });

  describe("Doses & Today's Schedule", () => {
    it("GET /api/profiles/:id/doses/today generates doses and returns decorated list", async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/doses/today`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.doses).toBeInstanceOf(Array);
      expect(res.body.doses.length).toBeGreaterThanOrEqual(2); // Metformin breakfast and dinner

      const dose = res.body.doses[0];
      expect(dose.id).toBeDefined();
      expect(dose.status).toBe("pending");
      expect(dose.displayStatus).toBeDefined();
      createdDoseId = dose.id;
    });

    it("PATCH /api/profiles/:id/doses/:doseId records dose (viewer blocked)", async () => {
      // Non-existent dose -> 404
      const fakeDoseId = new mongoose.Types.ObjectId().toString();
      const notFoundRes = await request(app)
        .patch(`/api/profiles/${profileId}/doses/${fakeDoseId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ status: "taken" });
      expect(notFoundRes.status).toBe(404);

      // Viewer blocked
      const viewerRes = await request(app)
        .patch(`/api/profiles/${profileId}/doses/${createdDoseId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ status: "taken" });

      expect(viewerRes.status).toBe(403);

      // Editor records dose as taken
      const editorRes = await request(app)
        .patch(`/api/profiles/${profileId}/doses/${createdDoseId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ status: "taken", reasonText: "Taken with warm water" });

      expect(editorRes.status).toBe(200);
      expect(editorRes.body.dose.status).toBe("taken");
      expect(editorRes.body.dose.reasonText).toBe("Taken with warm water");
      expect(editorRes.body.dose.recordedBy.toString()).toBe(editorId);
    });

    it("GET /api/profiles/:id/doses/summary returns adherence statistics across statuses", async () => {
      // Seed a spilled dose, a skipped dose, and a past due (missed) dose to exercise branches
      const now = new Date();
      await mongoose.connection.collection("doseevents").insertMany([
        {
          profileId: new mongoose.Types.ObjectId(profileId),
          medicineId: new mongoose.Types.ObjectId(createdMedicineId),
          scheduledFor: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago (missed)
          status: "pending",
          reasonText: "",
          recordedBy: null,
          recordedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          profileId: new mongoose.Types.ObjectId(profileId),
          medicineId: new mongoose.Types.ObjectId(createdMedicineId),
          scheduledFor: new Date(now.getTime() - 1000 * 60 * 60 * 4),
          status: "spilled",
          reasonText: "dropped",
          recordedBy: new mongoose.Types.ObjectId(editorId),
          recordedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          profileId: new mongoose.Types.ObjectId(profileId),
          medicineId: new mongoose.Types.ObjectId(createdMedicineId),
          scheduledFor: new Date(now.getTime() - 1000 * 60 * 60 * 3),
          status: "skipped",
          reasonText: "conscious skip",
          recordedBy: new mongoose.Types.ObjectId(editorId),
          recordedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const res = await request(app)
        .get(`/api/profiles/${profileId}/doses/summary?days=7`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.days).toBe(7);
      expect(res.body.summary.taken).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.spilled).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.skipped).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.missed).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.adherenceRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Appointments", () => {
    it("creates, retrieves, updates and deletes appointments", async () => {
      // Create appointment
      const createRes = await request(app)
        .post(`/api/profiles/${profileId}/appointments`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          title: "Dentist Routine Cleaning",
          doctorName: "Dr. A. Rao",
          location: "Indiranagar Dental Care",
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          notes: "Bring dental records",
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.appointment.title).toBe("Dentist Routine Cleaning");
      createdAppointmentId = createRes.body.appointment.id;

      // Viewer lists appointments
      const listRes = await request(app)
        .get(`/api/profiles/${profileId}/appointments`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${viewerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.appointments).toHaveLength(1);

      // Editor updates appointment
      const updateRes = await request(app)
        .patch(`/api/profiles/${profileId}/appointments/${createdAppointmentId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ notes: "Appointment confirmed by phone" });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.appointment.notes).toBe("Appointment confirmed by phone");

      // Editor deletes appointment
      const deleteRes = await request(app)
        .delete(`/api/profiles/${profileId}/appointments/${createdAppointmentId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1");

      expect(deleteRes.status).toBe(204);

      // 404 on fake appointment
      const fakeAptId = new mongoose.Types.ObjectId().toString();
      const notFoundPatch = await request(app)
        .patch(`/api/profiles/${profileId}/appointments/${fakeAptId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({ notes: "Ghost" });
      expect(notFoundPatch.status).toBe(404);

      const notFoundDelete = await request(app)
        .delete(`/api/profiles/${profileId}/appointments/${fakeAptId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1");
      expect(notFoundDelete.status).toBe(404);
    });
  });

  describe("Doctor Contacts (Elder only)", () => {
    it("creates, lists, and revokes doctor contact with consent recording", async () => {
      // Editor blocked from creating doctor contacts
      const editorRes = await request(app)
        .post(`/api/profiles/${profileId}/doctor-contacts`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${editorToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          kind: "family_doctor",
          name: "Dr. K. Sharma",
          email: "dr.sharma@example.com",
          whatsappNumber: "+919876543210",
        });

      expect(editorRes.status).toBe(403);

      // Elder creates doctor contact
      const createRes = await request(app)
        .post(`/api/profiles/${profileId}/doctor-contacts`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1")
        .send({
          kind: "family_doctor",
          name: "Dr. K. Sharma",
          email: "dr.sharma@example.com",
          whatsappNumber: "+919876543210",
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.contact.name).toBe("Dr. K. Sharma");
      expect(createRes.body.contact.consentRecordedAt).toBeDefined();
      createdContactId = createRes.body.contact.id;

      // Elder lists contacts
      const listRes = await request(app)
        .get(`/api/profiles/${profileId}/doctor-contacts`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.contacts).toHaveLength(1);

      // Elder revokes contact
      const revokeRes = await request(app)
        .delete(`/api/profiles/${profileId}/doctor-contacts/${createdContactId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1");

      expect(revokeRes.status).toBe(204);

      // Contact is revoked
      const afterList = await request(app)
        .get(`/api/profiles/${profileId}/doctor-contacts`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`);

      expect(afterList.body.contacts).toHaveLength(0);

      // 404 on fake contact revoke
      const fakeContactId = new mongoose.Types.ObjectId().toString();
      const notFoundRevoke = await request(app)
        .delete(`/api/profiles/${profileId}/doctor-contacts/${fakeContactId}`)
        .set("Cookie", `${COOKIE_NAMES.ACCESS_TOKEN}=${elderToken}`)
        .set("X-Saath-CSRF", "1");
      expect(notFoundRevoke.status).toBe(404);
    });
  });
});
