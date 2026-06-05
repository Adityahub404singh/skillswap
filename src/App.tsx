import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


import { AuthProvider } from "./store/AuthProvider";
import { ToastContainer } from "react-toastify";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import PrivateRoute from "./components/PrivateRoute";
import AboutPage from "./components/AboutPage";
import "react-toastify/dist/ReactToastify.css";

// Lazy load pages
const Splash = lazy(() => import("./pages/Splash"));
const Home = lazy(() => import("./pages/home"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Tutors = lazy(() => import("./pages/tutors"));
const Courses = lazy(() => import("./pages/Courses"));
const Reviews = lazy(() => import("./pages/StudentReviews"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Policies = lazy(() => import("./pages/Policies"));
const Pricing = lazy(() => import("./pages/Pricing"));
const TutorRegistration = lazy(() => import("./pages/TutorRegistration"));
const FindTutors = lazy(() => import("./pages/FindTutors"));
const BecomeATutor = lazy(() => import("./pages/BecomeTutor"));
const SuccessStories = lazy(() => import("./pages/SuccessStories"));
const TutorResources = lazy(() => import("./pages/TutorResources"));
const StudentReviews = lazy(() => import("./pages/StudentReviews"));
const TutorHome = lazy(() => import("./pages/TutorHome"));
const StudentHome = lazy(() => import("./pages/StudentHome"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const AddCourse = lazy(() => import("./pages/addCourse"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const Booking = lazy(() => import("./pages/Booking"));
const PaymentPage = lazy(() => import("./pages/Payment"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const KycUpload = lazy(() => import("./pages/KycUpload"));
const KycStatus = lazy(() => import("./pages/KycStatus"));

const Loader = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
      <p className="text-slate-400 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="text-8xl mb-6">ðŸ”</div>
    <h1 className="text-4xl font-black text-slate-900 mb-3">404</h1>
    <p className="text-slate-500 text-lg mb-8">Oops! Page not found.</p>
    <a href="/" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:opacity-90 transition">
      Go Home
    </a>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-layout bg-slate-50">
          <Header />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            closeOnClick
            pauseOnHover
            draggable
            toastClassName="rounded-xl shadow-lg text-sm font-medium"
          />
          <main className="app-main">
            <Suspense fallback={<Loader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/splash" element={<Splash />} />
                <Route path="/" element={<Home />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/tutor-registration" element={<TutorRegistration />} />
                <Route path="/tutors" element={<Tutors />} />
                <Route path="/tutors/:id" element={<TutorProfile />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/find-tutors" element={<FindTutors />} />
                <Route path="/become-a-tutor" element={<BecomeATutor />} />
                <Route path="/success-stories" element={<SuccessStories />} />
                <Route path="/tutor-resources" element={<TutorResources />} />
                <Route path="/student-reviews" element={<StudentReviews />} />
                <Route path="/subjects" element={<StudentReviews />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="*" element={<NotFound />} />

                {/* Chat */}
                <Route path="/chat/:studentId/:tutorId" element={
                  <PrivateRoute allowedRoles={["student", "tutor"]}><ChatPage /></PrivateRoute>
                } />

                {/* Booking */}
                <Route path="/booking/:courseId" element={
                  <PrivateRoute allowedRoles={["student"]}><Booking /></PrivateRoute>
                } />

                {/* Payment */}
                <Route path="/payment/:bookingId" element={
                  <PrivateRoute allowedRoles={["student"]}><PaymentPage bookingId={"bookingId"} /></PrivateRoute>
                } />
                <Route path="/booking-confirmation" element={
                  <PrivateRoute allowedRoles={["student"]}><BookingConfirmation /></PrivateRoute>
                } />

                {/* Student */}
                <Route path="/student-home" element={
                  <PrivateRoute allowedRoles={["student"]}><StudentHome /></PrivateRoute>
                } />

                {/* Tutor */}
                <Route path="/tutor-home" element={
                  <PrivateRoute allowedRoles={["tutor"]}><TutorHome /></PrivateRoute>
                } />
                <Route path="/tutor-profile" element={
                  <PrivateRoute allowedRoles={["tutor"]}><TutorProfile /></PrivateRoute>
                } />
                <Route path="/edit-profile" element={
                  <PrivateRoute allowedRoles={["tutor"]}><EditProfile /></PrivateRoute>
                } />
                <Route path="/add-course" element={
                  <PrivateRoute allowedRoles={["tutor"]}><AddCourse /></PrivateRoute>
                } />

                {/* Shared */}
                <Route path="/my-bookings" element={
                  <PrivateRoute allowedRoles={["student", "tutor"]}><MyBookings /></PrivateRoute>
                } />
                <Route path="/dashboard" element={
                  <PrivateRoute allowedRoles={["student", "tutor"]}><Dashboard /></PrivateRoute>
                } />
                <Route path="/profile" element={
                  <PrivateRoute allowedRoles={["student", "tutor"]}><Profile /></PrivateRoute>
                } />

                {/* KYC */}
                <Route path="/kyc/upload" element={
                  <PrivateRoute allowedRoles={["tutor"]}><KycUpload /></PrivateRoute>
                } />
                <Route path="/kyc/status" element={
                  <PrivateRoute allowedRoles={["tutor"]}><KycStatus /></PrivateRoute>
                } />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}


