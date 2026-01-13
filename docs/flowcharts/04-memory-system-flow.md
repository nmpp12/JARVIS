# Memory System Flow

```mermaid
graph TB
    subgraph "Input Sources"
        Query[User Query]
        Response[AI Response]
        Interaction[User Interaction]
    end
    
    subgraph "Memory Processing"
        Process[Process Input]
        Extract[Extract Entities]
        Analyze[Analyze Importance]
        Classify[Classify Type]
    end
    
    subgraph "Storage Decision"
        Decision{Storage Type?}
    end
    
    subgraph "Short-term Memory"
        STM[Short-term Storage]
        STMLimit{Size > 20?}
        STMEvict[Evict Oldest]
    end
    
    subgraph "Long-term Memory"
        LTM[Long-term Storage]
        LTMLimit{Size > 500?}
        LTMEvict[Evict Low Priority]
    end
    
    subgraph "Entity Memory"
        EntityStore[Entity Store]
        EntityUpdate[Update Count]
        EntityMerge[Merge Similar]
    end
    
    subgraph "Context Building"
        Retrieve[Retrieve Memories]
        Relevant[Find Relevant]
        Build[Build Context]
        Context[Context Object]
    end
    
    Query --> Process
    Response --> Process
    Interaction --> Process
    
    Process --> Extract
    Extract --> Analyze
    Analyze --> Classify
    
    Classify --> Decision
    
    Decision -->|Recent| STM
    Decision -->|Important| LTM
    Decision -->|Entity| EntityStore
    
    STM --> STMLimit
    STMLimit -->|Yes| STMEvict
    STMLimit -->|No| Done1
    STMEvict --> Done1[Stored]
    
    LTM --> LTMLimit
    LTMLimit -->|Yes| LTMEvict
    LTMLimit -->|No| Done2
    LTMEvict --> Done2[Stored]
    
    EntityStore --> EntityUpdate
    EntityUpdate --> EntityMerge
    EntityMerge --> Done3[Stored]
    
    Done1 --> Retrieve
    Done2 --> Retrieve
    Done3 --> Retrieve
    
    Retrieve --> Relevant
    Relevant --> Build
    Build --> Context
    
    Context --> Output[Used in Query]
    
    style STM fill:#4a90e2,stroke:#2c5aa0,color:#fff
    style LTM fill:#e85d75,stroke:#c7254e,color:#fff
    style EntityStore fill:#00d2d3,stroke:#00a8a9,color:#fff
    style Context fill:#00b894,stroke:#00a074,color:#fff
```

## Memory Types

### 1. Short-term Memory (STM)
- **Capacity**: 20 items
- **Duration**: Current session
- **Purpose**: Recent conversation context
- **Eviction**: FIFO (First In, First Out)

```javascript
{
  content: "User asked about weather",
  timestamp: "2026-01-13T14:30:00Z",
  type: "query"
}
```

### 2. Long-term Memory (LTM)
- **Capacity**: 500 items
- **Duration**: Persistent across sessions
- **Purpose**: Important information
- **Eviction**: Priority-based (lowest first)

```javascript
{
  content: "User prefers Celsius",
  timestamp: "2026-01-10T10:00:00Z",
  importance: 8,
  type: "preference"
}
```

### 3. Entity Memory
- **Capacity**: Unlimited (merged)
- **Duration**: Persistent
- **Purpose**: Named entities and facts
- **Eviction**: Never (merged instead)

```javascript
{
  name: "John",
  type: "person",
  attributes: {
    role: "colleague",
    location: "Lisbon"
  },
  count: 15,
  lastMentioned: "2026-01-13T14:30:00Z"
}
```

## Importance Scoring

```mermaid
graph LR
    Input[Memory Item] --> Check1{User mentioned name?}
    Check1 -->|Yes| Score1[+3 points]
    Check1 -->|No| Check2
    
    Check2{Preference stated?}
    Check2 -->|Yes| Score2[+5 points]
    Check2 -->|No| Check3
    
    Check3{Explicit instruction?}
    Check3 -->|Yes| Score3[+4 points]
    Check3 -->|No| Check4
    
    Check4{Emotional content?}
    Check4 -->|Yes| Score4[+2 points]
    Check4 -->|No| Score5[+1 point]
    
    Score1 --> Total[Total Score]
    Score2 --> Total
    Score3 --> Total
    Score4 --> Total
    Score5 --> Total
    
    Total --> Decision{Score >= 5?}
    Decision -->|Yes| LTM[Long-term]
    Decision -->|No| STM[Short-term]
```

## Context Retrieval

### Search Algorithm
1. Get recent items from STM (last 5)
2. Search LTM for keyword matches
3. Find related entities
4. Rank by relevance
5. Combine into context object

### Relevance Calculation
```
relevance = (
  keyword_match * 0.4 +
  recency * 0.3 +
  importance * 0.2 +
  frequency * 0.1
)
```

## Memory Consolidation

```mermaid
graph TB
    STM[Short-term Memory] --> Eval{Evaluate Importance}
    Eval -->|High| Promote[Promote to LTM]
    Eval -->|Low| Discard[Discard]
    
    Promote --> LTM[Long-term Memory]
    
    LTM --> Periodic{Periodic Review}
    Periodic --> Decay[Decay Score]
    Decay --> Keep{Still Important?}
    Keep -->|Yes| LTM
    Keep -->|No| Archive[Archive]
    
    style Promote fill:#00b894,stroke:#00a074,color:#fff
    style Discard fill:#d63031,stroke:#b71c1c,color:#fff
```

## Usage Example

```javascript
// Store interaction
memory.storeInteraction({
  query: "What's the weather in Lisbon?",
  response: "It's 18°C and sunny in Lisbon.",
  timestamp: new Date()
});

// Retrieve context
const context = memory.getRelevantContext("weather");
// Returns:
// {
//   recent: [...], // Last 5 interactions
//   relevant: [...], // Related memories
//   entities: [...] // Related entities
// }
```
