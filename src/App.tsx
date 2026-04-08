import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CalendarPage from "@/pages/CalendarPage";
import NewBooking from "@/pages/NewBooking";
import MyBookings from "@/pages/MyBookings";
import AdminReservations from "@/pages/AdminReservations";
import AdminRooms from "@/pages/AdminRooms";
import AdminUsers from "@/pages/AdminUsers";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<AppLayout />}>
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/bookings/new" element={
                <ProtectedRoute allowedRoles={["admin", "member"]}>
                  <NewBooking />
                </ProtectedRoute>
              } />
              <Route path="/my-bookings" element={
                <ProtectedRoute allowedRoles={["admin", "member"]}>
                  <MyBookings />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={["admin", "direction"]}>
                  <AdminReservations />
                </ProtectedRoute>
              } />
              <Route path="/admin/archived" element={
                <ProtectedRoute allowedRoles={["admin", "direction"]}>
                  <AdminReservations archivedOnly={true} />
                </ProtectedRoute>
              } />
              <Route path="/admin/rooms" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminRooms />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminUsers />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
