import asyncio
from datetime import date, datetime, timedelta
import uuid

from app.database import AsyncSessionLocal, init_db
from app.models.user import Profile
from app.models.organization import Organization, OrganizationMember, OrganizationSetting
from app.models.provider import DoctorProfile, Department, DoctorDepartment, ServiceCategory
from app.models.clinic import (
    Patient,
    DoctorSchedule,
    Appointment,
    QueueEntry,
    PatientVisit,
    Prescription,
    PrescriptionItem,
    Invoice,
    InvoiceItem,
    Payment,
    FollowUp,
)
from app.models.lab import LabTest, LabOrder, LabOrderItem, LabSample, LabResult, DiagnosticReport
from app.models.ambulance import Ambulance, AmbulanceRequest


async def seed_demo_data():
    print("Initializing Database tables...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        org_check = await session.get(Organization, "demo-clinic-01")
        if org_check:
            print("Demo data already seeded! Exiting.")
            return

        print("Seeding synthetic users & profiles...")
        # 1. Staff & Doctor Profiles
        doc1_user = Profile(
            id="demo-user-doc1",
            email="dr.sharma@healthcore.demo",
            full_name="Dr. Rajesh Sharma",
            phone="+91-9820112233",
        )
        doc2_user = Profile(
            id="demo-user-doc2",
            email="dr.mehta@healthcore.demo",
            full_name="Dr. Ananya Mehta",
            phone="+91-9820223344",
        )
        owner_user = Profile(
            id="demo-user-owner",
            email="admin@healthcore.demo",
            full_name="Dr. Vikram Malhotra (Director)",
            phone="+91-9820334455",
        )
        patient_user = Profile(
            id="demo-user-patient",
            email="patient.demo@healthcore.demo",
            full_name="Rohan Verma",
            phone="+91-9820445566",
        )
        session.add_all([doc1_user, doc2_user, owner_user, patient_user])
        await session.flush()

        print("Seeding healthcare organizations...")
        # 2. Healthcare Facilities
        clinic_org = Organization(
            id="demo-clinic-01",
            name="Apex Family Health Clinic",
            slug="apex-family-clinic",
            type="clinic",
            address="Plot 42, Central Avenue, Powai",
            city="Mumbai",
            state="Maharashtra",
            phone="+91-22-25701122",
            email="contact@apexclinic.demo",
            is_active=True,
        )
        hosp_org = Organization(
            id="demo-hospital-01",
            name="Metro Super-Specialty Hospital & Trauma Care",
            slug="metro-super-specialty-hospital",
            type="hospital",
            address="Sector 18, Vashi",
            city="Navi Mumbai",
            state="Maharashtra",
            phone="+91-22-27803344",
            email="info@metrohospital.demo",
            is_active=True,
        )
        diag_org = Organization(
            id="demo-diag-01",
            name="Precise Diagnostics & Path Lab",
            slug="precise-diagnostics-pathlab",
            type="diagnostic_center",
            address="Shop 5-6, Galleria Mall, Hiranandani",
            city="Mumbai",
            state="Maharashtra",
            phone="+91-22-25709988",
            email="lab@precisediag.demo",
            is_active=True,
        )
        session.add_all([clinic_org, hosp_org, diag_org])
        await session.flush()

        # Memberships
        m1 = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=clinic_org.id,
            user_id=owner_user.id,
            role="organization_owner",
            status="active",
        )
        m2 = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=clinic_org.id,
            user_id=doc1_user.id,
            role="doctor",
            status="active",
        )
        m3 = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=hosp_org.id,
            user_id=owner_user.id,
            role="organization_owner",
            status="active",
        )
        m4 = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=hosp_org.id,
            user_id=doc2_user.id,
            role="doctor",
            status="active",
        )
        m5 = OrganizationMember(
            id=str(uuid.uuid4()),
            organization_id=diag_org.id,
            user_id=owner_user.id,
            role="organization_owner",
            status="active",
        )
        session.add_all([m1, m2, m3, m4, m5])

        # Hospital Departments
        dept_cardio = Department(
            id="demo-dept-cardio",
            organization_id=hosp_org.id,
            name="Cardiology & Critical Care",
            description="Comprehensive cardiac diagnostics, angioplasty and ICU units",
            is_active=True,
        )
        dept_peds = Department(
            id="demo-dept-peds",
            organization_id=hosp_org.id,
            name="Pediatrics & Neonatology",
            description="Child health and vaccination clinic",
            is_active=True,
        )
        session.add_all([dept_cardio, dept_peds])
        await session.flush()

        print("Seeding doctor profiles & weekly appointment schedules...")
        # Doctor Profiles
        doc_prof1 = DoctorProfile(
            id="demo-doc-prof-1",
            user_id=doc1_user.id,
            organization_id=clinic_org.id,
            specialty="General Medicine",
            qualifications="MBBS, MD (Internal Medicine)",
            experience_years=12,
            consultation_fee=500.00,
            bio="Senior family physician specializing in preventive health and lifestyle management.",
            is_available=True,
        )
        doc_prof2 = DoctorProfile(
            id="demo-doc-prof-2",
            user_id=doc2_user.id,
            organization_id=hosp_org.id,
            specialty="Cardiology",
            qualifications="MBBS, DM (Cardiology), FACC",
            experience_years=15,
            consultation_fee=850.00,
            bio="Consultant interventional cardiologist with expertise in heart rhythm and preventive cardiology.",
            is_available=True,
        )
        session.add_all([doc_prof1, doc_prof2])
        await session.flush()

        # Doctor Department association
        dd1 = DoctorDepartment(
            id=str(uuid.uuid4()),
            department_id=dept_cardio.id,
            doctor_profile_id=doc_prof2.id,
            is_primary=True,
        )
        session.add(dd1)

        # Schedules (all 7 days for easy testing)
        for day in range(7):
            session.add(
                DoctorSchedule(
                    id=f"demo-sched-doc1-{day}",
                    doctor_profile_id=doc_prof1.id,
                    organization_id=clinic_org.id,
                    day_of_week=day,
                    start_time="09:00",
                    end_time="13:00",
                    slot_duration_minutes=30,
                    is_active=True,
                )
            )
            session.add(
                DoctorSchedule(
                    id=f"demo-sched-doc2-{day}",
                    doctor_profile_id=doc_prof2.id,
                    organization_id=hosp_org.id,
                    day_of_week=day,
                    start_time="14:00",
                    end_time="18:00",
                    slot_duration_minutes=30,
                    is_active=True,
                )
            )

        print("Seeding patients, visits & billing records...")
        # Synthetic Patient linked to demo patient profile
        p1 = Patient(
            id="demo-patient-01",
            organization_id=clinic_org.id,
            user_id=patient_user.id,
            created_by=doc1_user.id,
            patient_code="PT-DEMO-001",
            full_name="Rohan Verma",
            date_of_birth=date(1992, 5, 14),
            gender="Male",
            phone="+91-9820445566",
            email="patient.demo@healthcore.demo",
            address="B-302, Lake View Towers, Powai, Mumbai",
            blood_group="B+",
            allergies="Penicillin, Sulfa drugs",
            emergency_contact_name="Sunita Verma (Mother)",
            emergency_contact_phone="+91-9820998877",
            is_active=True,
        )
        session.add(p1)
        await session.flush()

        # Scheduled Appointment for tomorrow
        tomorrow = date.today() + timedelta(days=1)
        appt1 = Appointment(
            id="demo-appt-01",
            organization_id=clinic_org.id,
            patient_id=p1.id,
            doctor_profile_id=doc_prof1.id,
            created_by=patient_user.id,
            appointment_date=tomorrow,
            start_time="10:00",
            end_time="10:30",
            appointment_type="consultation",
            reason="Routine health checkup & blood pressure monitoring",
            status="scheduled",
            scheduled_at=datetime.utcnow(),
        )
        session.add(appt1)

        # Walk-in queue entry
        queue1 = QueueEntry(
            id="demo-queue-01",
            organization_id=clinic_org.id,
            patient_id=p1.id,
            doctor_profile_id=doc_prof1.id,
            queue_number=1,
            walk_in_name="Rohan Verma",
            status="waiting",
            notes="Arrived for consultation",
        )
        session.add(queue1)

        # Prescription & Clinical Visit
        visit1 = PatientVisit(
            id="demo-visit-01",
            organization_id=clinic_org.id,
            patient_id=p1.id,
            doctor_profile_id=doc_prof1.id,
            visit_date=date.today(),
            chief_complaint="Mild seasonal fever and dry cough",
            diagnosis="Upper Respiratory Tract Infection (URTI)",
            clinical_notes="Vitals stable. BP 120/80. Chest clear.",
        )
        session.add(visit1)
        await session.flush()

        rx1 = Prescription(
            id="demo-rx-01",
            organization_id=clinic_org.id,
            patient_id=p1.id,
            visit_id=visit1.id,
            doctor_profile_id=doc_prof1.id,
            prescription_ref="RX-2026-DEMO-001",
            status="finalized",
            diagnosis_note="URTI - Symptomatic relief",
            instructions="Drink warm fluids. Avoid cold food.",
            finalized_at=datetime.utcnow(),
        )
        session.add(rx1)
        await session.flush()

        rx_item1 = PrescriptionItem(
            id=str(uuid.uuid4()),
            prescription_id=rx1.id,
            medication_name="Paracetamol",
            dosage="650mg",
            frequency="TDS (Three times a day)",
            duration="3 days",
            instructions="After meals",
        )
        session.add(rx_item1)

        # Invoice & Payment
        inv1 = Invoice(
            id="demo-inv-01",
            organization_id=clinic_org.id,
            patient_id=p1.id,
            created_by=doc1_user.id,
            invoice_number="INV-2026-DEMO-001",
            status="paid",
            subtotal=500.00,
            discount=0.00,
            tax=0.00,
            total=500.00,
            amount_paid=500.00,
            balance=0.00,
            notes="General consultation fee",
        )
        session.add(inv1)
        await session.flush()

        inv_item1 = InvoiceItem(
            id=str(uuid.uuid4()),
            invoice_id=inv1.id,
            description="Doctor Consultation",
            quantity=1,
            unit_price=500.00,
            total=500.00,
        )
        payment1 = Payment(
            id=str(uuid.uuid4()),
            organization_id=clinic_org.id,
            invoice_id=inv1.id,
            recorded_by=doc1_user.id,
            amount=500.00,
            method="upi",
            payment_date=date.today(),
            reference_number="UPI/20261014/998811",
            notes="Paid via GPay",
        )
        session.add_all([inv_item1, payment1])

        print("Seeding diagnostic lab tests & orders...")
        # 3. Lab Test Catalogue
        test_cbc = LabTest(
            id="demo-test-cbc",
            organization_id=diag_org.id,
            name="Complete Blood Count (CBC)",
            code="CBC-01",
            category="Hematology",
            description="Full automated 24-parameter hemogram with ESR",
            price=350.00,
            specimen_type="Whole Blood (EDTA)",
            turnaround_minutes=120,
            is_active=True,
        )
        test_lipid = LabTest(
            id="demo-test-lipid",
            organization_id=diag_org.id,
            name="Lipid Profile (Extended)",
            code="LIPID-01",
            category="Biochemistry",
            description="Total cholesterol, HDL, LDL, VLDL, triglycerides",
            price=750.00,
            specimen_type="Serum (Fasting)",
            turnaround_minutes=180,
            is_active=True,
        )
        session.add_all([test_cbc, test_lipid])
        await session.flush()

        # Lab Order
        lab_order1 = LabOrder(
            id="demo-lab-order-01",
            organization_id=diag_org.id,
            patient_id=p1.id,
            created_by=owner_user.id,
            order_number="ORD-20261014-001",
            status="completed",
            notes="Annual preventive screen",
        )
        session.add(lab_order1)
        await session.flush()

        item_cbc = LabOrderItem(
            id="demo-order-item-cbc",
            lab_order_id=lab_order1.id,
            lab_test_id=test_cbc.id,
            status="validated",
            price_at_order=350.00,
        )
        session.add(item_cbc)
        await session.flush()

        sample1 = LabSample(
            id="demo-sample-01",
            organization_id=diag_org.id,
            lab_order_id=lab_order1.id,
            sample_ref="SMP-20261014-B01",
            sample_type="EDTA Whole Blood",
            status="completed",
            collected_by=owner_user.id,
            collected_at=datetime.utcnow() - timedelta(hours=2),
            received_by=owner_user.id,
            received_at=datetime.utcnow() - timedelta(hours=1),
        )
        session.add(sample1)
        await session.flush()

        res_cbc = LabResult(
            id="demo-result-cbc",
            organization_id=diag_org.id,
            lab_order_item_id=item_cbc.id,
            lab_sample_id=sample1.id,
            result_value="14.8",
            unit="g/dL",
            reference_range_low="13.0",
            reference_range_high="17.0",
            result_flag="normal",
            entered_by=owner_user.id,
            entered_at=datetime.utcnow() - timedelta(minutes=45),
            validated_by=doc2_user.id,
            validated_at=datetime.utcnow() - timedelta(minutes=15),
            status="validated",
            notes="Hemoglobin within normal healthy range.",
        )
        session.add(res_cbc)

        report1 = DiagnosticReport(
            id="demo-report-01",
            organization_id=diag_org.id,
            lab_order_id=lab_order1.id,
            report_ref="REP-20261014-001",
            status="released",
            validated_by=doc2_user.id,
            validated_at=datetime.utcnow() - timedelta(minutes=10),
            released_by=owner_user.id,
            released_at=datetime.utcnow() - timedelta(minutes=5),
        )
        session.add(report1)

        print("Seeding ambulance units & emergency dispatch...")
        # 4. Ambulances & Emergency Request
        amb1 = Ambulance(
            id="demo-amb-01",
            organization_id=hosp_org.id,
            vehicle_number="MH-02-EM-1080",
            vehicle_type="ICU / Mobile Trauma",
            driver_name="Sanjay Pawar",
            driver_phone="+91-9820055112",
            service_area="Navi Mumbai & Thane Corridor",
            is_available=False,
            base_latitude=19.0760,
            base_longitude=72.8777,
            current_latitude=19.0680,
            current_longitude=72.8600,
        )
        amb2 = Ambulance(
            id="demo-amb-02",
            organization_id=hosp_org.id,
            vehicle_number="MH-02-EM-2040",
            vehicle_type="Advanced Cardiac Life Support",
            driver_name="Ganesh Patil",
            driver_phone="+91-9820077334",
            service_area="Mumbai Central & Western Suburbs",
            is_available=True,
            base_latitude=19.0596,
            base_longitude=72.8295,
            current_latitude=19.0596,
            current_longitude=72.8295,
        )
        session.add_all([amb1, amb2])
        await session.flush()

        amb_req1 = AmbulanceRequest(
            id="demo-amb-req-01",
            organization_id=hosp_org.id,
            user_id=patient_user.id,
            patient_name="Rohan Verma",
            contact_phone="+91-9820445566",
            pickup_address="B-302, Lake View Towers, Powai, Mumbai",
            pickup_latitude=19.1176,
            pickup_longitude=72.9060,
            emergency_type="Chest Pain / Arrhythmia",
            additional_notes="Patient experiencing severe palpitations. Floor 3, lift functional.",
            status="on_the_way",
            assigned_ambulance_id=amb1.id,
            eta_minutes=7.0,
            requested_at=datetime.utcnow() - timedelta(minutes=10),
            accepted_at=datetime.utcnow() - timedelta(minutes=8),
            dispatched_at=datetime.utcnow() - timedelta(minutes=5),
        )
        session.add(amb_req1)

        await session.commit()
        print("Successfully seeded all realistic demo data across Clinics, Hospitals, Labs, and Ambulances!")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
