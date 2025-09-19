# Focus Flow - Professional Project Structure

This document outlines the new professional folder structure implemented for the Focus Flow project.

## 📁 Project Structure

```
/src
  /components
    /ui                 # Reusable UI components
    /layout            # Layout-related components  
    /features          # Feature-specific components
      /analytics       # Analytics feature components
      /auth           # Authentication components
      /calendar       # Calendar feature components
      /chat           # Chat feature components
      /notifications  # Notification components
      /tasks          # Task management components
  /lib
    /config           # Configuration files
    /services         # API and external service integrations
    /types            # TypeScript type definitions
  /hooks              # Custom React hooks
  /utils              # Utility functions
```

## 🎯 Organization Principles

### 1. **Feature-Based Organization**
Components are organized by feature rather than by technical layer, making it easier to:
- Locate related components
- Understand feature boundaries
- Maintain and refactor features independently

### 2. **Clear Separation of Concerns**
- `components/ui`: Reusable, presentation-only components
- `components/layout`: App structure and layout components
- `components/features`: Business logic components organized by feature
- `lib/services`: External API integrations and business logic
- `lib/types`: Type definitions for better TypeScript support
- `hooks`: Reusable stateful logic
- `utils`: Pure utility functions

### 3. **Index Files for Clean Imports**
Each directory includes an `index.ts` file that exports all components/functions, enabling clean imports:

```typescript
// Instead of
import TaskCard from '../../../features/tasks/TaskCard';
import TaskForm from '../../../features/tasks/TaskForm';

// Use
import { TaskCard, TaskForm } from '../features/tasks';
```

## 📦 Component Categories

### UI Components (`/components/ui`)
Reusable, presentation-only components:
- `ErrorBoundary`: Error handling wrapper
- `ResponsiveContainer`: Responsive layout wrapper
- `TouchFriendlyButton`: Accessible button component

### Layout Components (`/components/layout`)
App structure and global components:
- `Layout`: Main app layout wrapper
- `Footer`: App footer
- `ThemeContext` & `ThemeToggle`: Theme management
- `KeyboardShortcutsHelp`: Keyboard shortcuts modal

### Feature Components (`/components/features`)
Business logic components organized by feature:

#### Tasks (`/features/tasks`)
- `TaskCard`: Individual task display
- `TaskForm`: Task creation/editing
- `TaskItem`: List item representation
- `TaskRecommendation`: AI-powered recommendations
- `RecommendationCard`: Recommendation display

#### Analytics (`/features/analytics`)
- `AnalyticsSummary`: Overview analytics
- `CategoryDistributionChart`: Category-based charts
- `MoodCorrelationChart`: Mood analysis
- `ProductivityTrendChart`: Productivity tracking
- `TaskCompletionChart`: Completion analytics

#### Authentication (`/features/auth`)
- `AuthContext`: Authentication state management

#### Calendar (`/features/calendar`)
- `CalendarEventModal`: Event creation/editing

#### Chat (`/features/chat`)
- `ChatInput`: Message input component
- `ChatMessage`: Message display component

#### Notifications (`/features/notifications`)
- `NotificationBell`: Notification indicator and list

## 🔧 Services (`/lib/services`)

### Core Services
- `supabase`: Database client and configuration
- `auth`: Authentication logic
- `analytics`: Analytics data processing
- `gemini`: AI/ML integrations
- `notifications`: Notification management
- `calendar-events`: Calendar functionality
- `chat`: Chat system logic
- `ollama`: Alternative AI service (renamed functions to avoid conflicts)

## 📝 Types (`/lib/types`)

TypeScript type definitions for:
- `task`: Task-related types
- `calendar`: Calendar event types
- `chat`: Chat message types
- `mood`: Mood tracking types
- `notification`: Notification types
- `recommendation`: AI recommendation types

## 🎣 Custom Hooks (`/hooks`)

Reusable stateful logic:
- `useLocalStorage`: Local storage management
- `useDebounce`: Debounced value hook

## 🛠 Utilities (`/utils`)

Pure utility functions:
- `formatDate`: Date formatting
- `capitalize`: String capitalization
- `debounce`: Function debouncing
- `generateId`: ID generation
- `sanitizeHtml`: HTML sanitization

## 🚀 Benefits of This Structure

1. **Scalability**: Easy to add new features without cluttering
2. **Maintainability**: Clear separation makes maintenance easier
3. **Discoverability**: Logical organization helps developers find code quickly
4. **Reusability**: Clear component categories promote reuse
5. **Type Safety**: Better TypeScript support with organized types
6. **Testing**: Feature-based organization makes testing more focused

## 🔄 Migration Notes

All existing functionality has been preserved during the restructuring:
- Import paths have been updated throughout the codebase
- All components maintain their original functionality
- Build process continues to work as expected
- No breaking changes to the application behavior

The restructuring focuses purely on organization without modifying any business logic or user-facing features.