import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import {
  DashBoard,
  LoginPage,
  SignupPage,
  ManageClubsAndOrganizerPage,
  CreateEvents,
  OrganizerCreation,
  BrowseEventsPage,
  EventDetailsPage,
  ProfilePage,
  ClubsAndOrganizersPage,
  OrganizerDetailPageWrapper,
  OrganizerEventDetailPage,
  EditEvent,
  PasswordResetRequestPage,
  TeamChatPage,
  OnGoingEventsPage,
} from './pages/index.js'
import { UserProvider } from './contexts/UserContexts.jsx'
import { RoleCheckLayer } from './components'


const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'signup',
        element: <SignupPage />
      },

      {
        path: 'login',
        element: <LoginPage />
      },

      {
        path: '',
        element: <LoginPage />
      },


      {
        path: 'participant-dashboard',
        element: (
          <RoleCheckLayer allowedRoles={['Participant']}>
            <DashBoard userRole='Participant' />
          </RoleCheckLayer>
        )
      },

      {
        path: 'organizer-dashboard',
        element: (
          <RoleCheckLayer allowedRoles={['Organizer']}>
            <Outlet />
          </RoleCheckLayer>
        ),
        children: [
          {
            path: '',
            element: (
              <DashBoard userRole='Organizer' />
            )
          },
          {
            path: 'event/:id',
            element: (
              <OrganizerEventDetailPage />
            )
          }
        ]
      },

      {
        path: 'admin-dashboard',
        element: (
          <RoleCheckLayer allowedRoles={['Admin']}>
            <DashBoard userRole='Admin' />
          </RoleCheckLayer>
        )
      },

      {
        path: 'browse-events',
        element: (
          <RoleCheckLayer allowedRoles={['Participant']}>
            <BrowseEventsPage />
          </RoleCheckLayer>
        )
      },
      {
        path: 'event/:id',
        element: (
          <RoleCheckLayer allowedRoles={['Participant']}>
            <EventDetailsPage />
          </RoleCheckLayer>
        )
      },
      {
        path: 'team-chat/:teamRegId',
        element: (
          <RoleCheckLayer allowedRoles={['Participant']}>
            <TeamChatPage />
          </RoleCheckLayer>
        )
      },
      {
        path: 'clubs-and-organizer',
        element: (
          <RoleCheckLayer allowedRoles={['Participant']}>
            <Outlet />
          </RoleCheckLayer>
        ),
        children: [
          {
            path: '',
            element: <ClubsAndOrganizersPage />
          },
          {
            path: 'organizer/:id',
            element: (
              <RoleCheckLayer allowedRoles={['Participant']}>
                <OrganizerDetailPageWrapper />
              </RoleCheckLayer>
            )
          },
        ]
      },
      {
        path: 'profile',
        element: (
          <RoleCheckLayer allowedRoles={['Participant', 'Organizer']}>
            <ProfilePage />
          </RoleCheckLayer>
        )
      },
      {
        path: 'manage-clubs-and-organizer',
        element: (
          <RoleCheckLayer allowedRoles={['Admin']}>
            <Outlet />
          </RoleCheckLayer>
        ),
        children: [
          {
            path: '',
            element: (
              <ManageClubsAndOrganizerPage />
            )
          },
          {
            path: 'organizer-creation',
            element: (
              <OrganizerCreation />
            )
          },
        ]
      },
      {
        path: 'password-reset-request',
        element: (
          <RoleCheckLayer allowedRoles={['Admin']}>
            <PasswordResetRequestPage />
          </RoleCheckLayer>
        )
      },
      {
        path: 'create-event',
        element: (
          <RoleCheckLayer allowedRoles={['Organizer']}>
            <Outlet />
          </RoleCheckLayer>
        ),
        children: [
          {
            path: '',
            element: <CreateEvents />
          },
          {
            path: 'draft/:id',
            element: <CreateEvents />
          },
          {
            path: 'edit/:id',
            element: <EditEvent />
          }
        ]
      },
      {
        path: 'ongoing-events',
        element: (
          <RoleCheckLayer allowedRoles={['Organizer']}>
            <Outlet />
          </RoleCheckLayer>
        ),
        children: [
          {
            path: '',
            element: <OnGoingEventsPage />
          },
          {
            path: 'event/:id',
            element: <OrganizerEventDetailPage />
          }
        ]
      }
    ]
  }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  </StrictMode>,
)
