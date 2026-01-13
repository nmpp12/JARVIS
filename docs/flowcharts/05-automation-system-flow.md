# Automation System Flow

```mermaid
graph TB
    subgraph "Automation Types"
        R[Routines]
        W[Workflows]
        S[Scheduled Actions]
        T[Triggers]
    end
    
    subgraph "Scheduler"
        Start([Scheduler Starts])
        Check{Check Time}
        Wait[Wait 1 minute]
    end
    
    subgraph "Routine Execution"
        CheckR{Routine Due?}
        ExecR[Execute Routine]
        ActR[Run Actions]
        NextR[Calculate Next Run]
    end
    
    subgraph "Workflow Execution"
        CheckW{Trigger Fired?}
        ExecW[Execute Workflow]
        StepW[Execute Steps]
        ResultW[Collect Results]
    end
    
    subgraph "Scheduled Execution"
        CheckS{Action Due?}
        ExecS[Execute Action]
        MarkS[Mark Complete]
    end
    
    subgraph "Trigger Evaluation"
        CheckT{Condition Met?}
        ExecT[Fire Trigger]
        ActionT[Execute Action]
    end
    
    Start --> Check
    Check --> CheckR
    Check --> CheckW
    Check --> CheckS
    Check --> CheckT
    
    CheckR -->|Yes| ExecR
    CheckR -->|No| Wait
    ExecR --> ActR
    ActR --> NextR
    NextR --> Wait
    
    CheckW -->|Yes| ExecW
    CheckW -->|No| Wait
    ExecW --> StepW
    StepW --> ResultW
    ResultW --> Wait
    
    CheckS -->|Yes| ExecS
    CheckS -->|No| Wait
    ExecS --> MarkS
    MarkS --> Wait
    
    CheckT -->|Yes| ExecT
    CheckT -->|No| Wait
    ExecT --> ActionT
    ActionT --> Wait
    
    Wait --> Check
    
    style Start fill:#00d2d3,stroke:#00a8a9,color:#fff
    style ExecR fill:#4a90e2,stroke:#2c5aa0,color:#fff
    style ExecW fill:#e85d75,stroke:#c7254e,color:#fff
    style ExecS fill:#fdcb6e,stroke:#e17055,color:#fff
    style ExecT fill:#00b894,stroke:#00a074,color:#fff
```

## Automation Types

### 1. Routines (Recurring)
```javascript
{
  id: 1,
  name: "Morning Briefing",
  schedule: "daily",
  time: "09:00",
  actions: [
    { type: "speak", params: { text: "Good morning" } },
    { type: "weather", params: { location: "Lisbon" } },
    { type: "task", params: { list: "today" } }
  ]
}
```

### 2. Workflows (Sequential)
```javascript
{
  id: 2,
  name: "Project Setup",
  trigger: "manual",
  steps: [
    { 
      type: "task",
      params: { action: "create", title: "Initialize repo" },
      critical: true
    },
    {
      type: "task",
      params: { action: "create", title: "Setup CI/CD" },
      critical: false
    },
    {
      type: "notification",
      params: { message: "Project setup complete" }
    }
  ]
}
```

### 3. Scheduled Actions (One-time)
```javascript
{
  id: 3,
  name: "Meeting Reminder",
  action: "notification",
  params: {
    title: "Meeting in 15 minutes",
    message: "Team sync at 3pm"
  },
  scheduledFor: "2026-01-13T14:45:00Z"
}
```

### 4. Triggers (Conditional)
```javascript
{
  id: 4,
  name: "Low Battery Alert",
  type: "condition",
  condition: "battery < 20%",
  action: {
    type: "notification",
    params: { message: "Battery low, please charge" }
  }
}
```

## Routine Execution Flow

```mermaid
sequenceDiagram
    participant Scheduler
    participant Routine
    participant Actions
    participant Plugins
    
    Scheduler->>Routine: Check if due
    Routine->>Routine: Check enabled?
    Routine->>Routine: Check time match?
    
    alt Routine is due
        Routine->>Actions: Execute action 1
        Actions->>Plugins: Call plugin method
        Plugins-->>Actions: Result
        
        Routine->>Actions: Execute action 2
        Actions->>Plugins: Call plugin method
        Plugins-->>Actions: Result
        
        Routine->>Actions: Execute action 3
        Actions->>Plugins: Call plugin method
        Plugins-->>Actions: Result
        
        Routine->>Routine: Update lastRun
        Routine->>Routine: Calculate nextRun
    else Not due
        Routine-->>Scheduler: Skip
    end
```

## Workflow Execution Flow

```mermaid
stateDiagram-v2
    [*] --> Triggered
    Triggered --> Step1: Execute
    
    Step1 --> CheckStep1: Check result
    CheckStep1 --> Step2: Success
    CheckStep1 --> Failed: Failure (if critical)
    CheckStep1 --> Step2: Failure (if not critical)
    
    Step2 --> CheckStep2: Check result
    CheckStep2 --> Step3: Success
    CheckStep2 --> Failed: Failure (if critical)
    CheckStep2 --> Step3: Failure (if not critical)
    
    Step3 --> Complete: All steps done
    
    Complete --> [*]
    Failed --> [*]
```

## Schedule Calculation

### Daily Schedule
```javascript
function calculateNextRun(schedule, time) {
  const [hours, minutes] = time.split(':');
  let next = new Date();
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= new Date()) {
    // If time passed today, schedule for tomorrow
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}
```

### Weekly Schedule
```javascript
function calculateNextWeekly(schedule, time, dayOfWeek) {
  let next = calculateNextRun(schedule, time);
  
  // Advance to target day of week
  while (next.getDay() !== dayOfWeek) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}
```

## Action Types

| Type | Description | Example |
|------|-------------|----------|
| `notification` | Show system notification | `{ type: 'notification', params: { message: 'Hello' } }` |
| `speak` | Text-to-speech | `{ type: 'speak', params: { text: 'Good morning' } }` |
| `reminder` | Create reminder | `{ type: 'reminder', params: { message: 'Call John', time: '15:00' } }` |
| `task` | Create/manage task | `{ type: 'task', params: { action: 'create', title: 'New task' } }` |
| `weather` | Check weather | `{ type: 'weather', params: { location: 'Lisbon' } }` |
| `custom` | Custom handler | `{ type: 'custom', handler: async (params) => {...} }` |

## Error Handling

```mermaid
graph TB
    Action[Execute Action] --> Try{Try Execute}
    Try -->|Success| Log[Log Success]
    Try -->|Error| Check{Critical?}
    
    Check -->|Yes| Stop[Stop Workflow]
    Check -->|No| Continue[Continue]
    
    Log --> Next[Next Action]
    Continue --> Next
    Stop --> Report[Report Error]
    
    style Stop fill:#d63031,stroke:#b71c1c,color:#fff
    style Log fill:#00b894,stroke:#00a074,color:#fff
```

## Usage Examples

### Create Daily Routine
```javascript
automation.createRoutine({
  name: "Morning Briefing",
  description: "Daily morning updates",
  schedule: "daily",
  time: "09:00",
  actions: [
    { type: "speak", params: { text: "Good morning!" } },
    { type: "weather", params: { location: "Lisbon" } }
  ]
});
```

### Create Workflow
```javascript
automation.createWorkflow({
  name: "Deploy to Production",
  trigger: "manual",
  steps: [
    { type: "custom", handler: runTests, critical: true },
    { type: "custom", handler: buildApp, critical: true },
    { type: "custom", handler: deploy, critical: true },
    { type: "notification", params: { message: "Deployed!" } }
  ]
});
```

### Schedule One-time Action
```javascript
automation.scheduleAction({
  name: "Meeting Reminder",
  action: "notification",
  params: { message: "Meeting in 15 min" },
  when: new Date(Date.now() + 15 * 60 * 1000)
});
```
