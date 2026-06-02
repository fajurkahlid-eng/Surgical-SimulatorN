import { Link } from 'react-router-dom';
import AppNav from '../components/AppNav';
import MermaidDiagram from '../components/MermaidDiagram';
import { useLang } from '../context/LangContext';

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | null)[][];
}): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-teal-700/60">
      <table className="w-full text-sm text-start">
        <thead>
          <tr className="border-b border-teal-700/60 bg-teal-900/60">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-teal-200 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-teal-800/50 last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-teal-300">
                  {cell ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImplementationReport(): JSX.Element {
  const { t } = useLang();

  return (
    <div className="min-h-screen bg-teal-950 text-teal-100 flex flex-col">
      <AppNav />
      <main className="flex-1 container-page max-w-4xl py-8 sm:py-10">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {String(t('nav.implementationReport'))}
          </h1>
          <p className="text-teal-400 text-sm sm:text-base">
            Implementation Report — Surgical Training Environment (VR).
          </p>
        </header>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            1. Introduction — Tools & Technologies Used
          </h2>
          <Table
            headers={['Technology', 'Purpose', 'Where']}
            rows={[
              ['React 18', 'UI components, routing, state', 'src/pages/, src/components/, src/App.tsx'],
              ['Vite 5', 'Build, dev server, HMR', 'vite.config.js, package.json'],
              ['Tailwind CSS 4', 'Styling, layout, responsive', 'src/index.css, utility classes in TSX'],
              ['TypeScript', 'Types, interfaces, typecheck', 'src/**/*.ts, src/**/*.tsx, tsconfig.json'],
              ['Three.js', '3D scene, camera, WebGL', 'src/scene.js, src/vr.js'],
              ['WebXR', 'VR mode', 'src/vr.js'],
              ['MySQL', 'Backend database', 'server/index.js, server/schema.sql'],
              ['React Router v6', 'Client-side routing', 'src/App.tsx'],
            ]}
          />
          <p className="text-teal-400 text-sm mt-3">Defined in package.json and used across src/.</p>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            2. Creating & Designing the User Interface
          </h2>
          <ul className="space-y-2 text-teal-300">
            <li><strong className="text-teal-200">Pages:</strong> Landing, Overview, Login, Dashboard, Training, Reports.</li>
            <li><strong className="text-teal-200">Navigation:</strong> AppNav, DashboardNav; links to Home, Overview, Simulator, Reports, Login/Dashboard/Logout.</li>
            <li><strong className="text-teal-200">Simulator UI:</strong> simulator.html, main.js, ui.js, style.css — header, sidebar, canvas, guidance strip, bottom bar.</li>
            <li><strong className="text-teal-200">Layout:</strong> Responsive with container-page, Tailwind breakpoints, RTL support.</li>
          </ul>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            3. Using Standards — Cascading Style Sheets (CSS)
          </h2>
          <ul className="space-y-2 text-teal-300">
            <li><strong className="text-teal-200">Tailwind:</strong> Utility classes in all React pages; @theme in index.css.</li>
            <li><strong className="text-teal-200">Custom CSS:</strong> index.css (container-page, focus, print, animate-nav-progress); style.css (simulator).</li>
            <li><strong className="text-teal-200">Cascading:</strong> Global in index.css; component-level classes; minimal inline for dynamic values.</li>
          </ul>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            4. Coding Issues
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.1 Client-Side Validation</h3>
              <p className="text-teal-400 text-sm">src/utils/validation.ts — validateEmail, validatePassword, validateRequired. Used in Login.tsx.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.2 Naming Conventions</h3>
              <p className="text-teal-400 text-sm">camelCase (vars/functions), PascalCase (components/classes), UPPER_SNAKE (constants), leading _ (private).</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.3 Generic Approach</h3>
              <p className="text-teal-400 text-sm">Reusable components, Auth/Db/Lang context, DB helpers (run, exec, getFirst), i18n.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.4 Keeping Class Members Private</h3>
              <p className="text-teal-400 text-sm">Underscore convention in scene.js, gameLogic.js, ui.js (_tempVec, _isHoldStep, etc.).</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.5 Garbage Collection</h3>
              <p className="text-teal-400 text-sm">Three.js dispose; event listener removal in contexts; timer clear in main.js.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.6 Handling Errors</h3>
              <p className="text-teal-400 text-sm">try/catch in API client, Auth/Lang storage parse, PrivateRoute, Reports, main.js, vr.js.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">4.7 Re-using Code</h3>
              <p className="text-teal-400 text-sm">Shared components, validation.ts, types/index.ts, i18n, SceneManager/GameLogic/UI/VRManager modules.</p>
            </div>
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            5. Database Issues
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">5.1 Database Type</h3>
              <p className="text-teal-400 text-sm">MySQL via Express backend (server/). API at localhost:3001. Schema in server/schema.sql.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">5.2 Tables ↔ Types Consistency</h3>
              <p className="text-teal-400 text-sm">TRAINEES ↔ User; REPORTS ↔ ReportRow; SESSIONS/COURSES used in queries. Schema in server/schema.sql; interfaces in api/client.ts.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">5.3 User Authentication</h3>
              <p className="text-teal-400 text-sm">AuthContext (localStorage); Login.tsx (validate, register/login); PrivateRoute for /dashboard; simulator receives traineeId/sessionId in URL.</p>
            </div>
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            6. Object-Oriented Code Examples
          </h2>
          <ul className="space-y-2 text-teal-300">
            <li><strong className="text-teal-200">SceneManager (scene.js):</strong> Class; _ prefix for private state; init(), onResize(), startDrag(), etc.</li>
            <li><strong className="text-teal-200">GameLogic (gameLogic.js):</strong> Class; _incisionPos, _isHoldStep(); start(), getCurrentStep(), tick().</li>
            <li><strong className="text-teal-200">UI (ui.js):</strong> Class; internal refs; callbacks from constructor.</li>
            <li><strong className="text-teal-200">VRManager (vr.js):</strong> Class; enterVR(); XR session handling.</li>
            <li><strong className="text-teal-200">Contexts:</strong> AuthProvider/useAuth, DbProvider, LangProvider/useLang — OO-like encapsulation.</li>
          </ul>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            7. Summary Checklist
          </h2>
          <Table
            headers={['Requirement', 'Status', 'Location / Note']}
            rows={[
              ['Introduction / Tools & technologies', 'Done', 'package.json, vite.config.js, src/'],
              ['Creating/designing user interface', 'Done', 'All pages, simulator UI, style.css'],
              ['Using standards / CSS', 'Done', 'Tailwind + index.css, style.css'],
              ['Client-side validation', 'Done', 'src/utils/validation.ts, Login.tsx'],
              ['Variable and function naming', 'Done', 'camelCase, PascalCase, UPPER_SNAKE, _private'],
              ['Generic approach', 'Done', 'Shared components, context, DB helpers, i18n'],
              ['Keeping class members private', 'Done', 'scene.js, gameLogic.js, ui.js'],
              ['Garbage collection / cleanup', 'Done', 'Disposal, listener removal, timer clear'],
              ['Handling errors', 'Done', 'try/catch in DB, auth, init, VR'],
              ['Re-using code', 'Done', 'Components, utils, types, i18n, simulator modules'],
              ['Suitable database type', 'Done', 'MySQL (server/)'],
              ['Consistency tables ↔ types', 'Done', 'schema.ts, types/index.ts'],
              ['User authentication', 'Done', 'AuthContext, Login, PrivateRoute, simulator params'],
              ['OOP code examples', 'Done', 'SceneManager, GameLogic, UI, VRManager, contexts'],
            ]}
          />
          <p className="text-teal-500 text-sm mt-3">
            Database: MySQL. Run <code className="bg-teal-900/60 px-1 rounded">npm run server</code> to start the backend.
          </p>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            8. System Architecture & Design
          </h2>
          <p className="text-teal-400 text-sm mb-4">
            React SPA with LangProvider → DbProvider → AuthProvider → BrowserRouter. Simulator runs separately; data flows via URL params and localStorage.
          </p>
          <MermaidDiagram
            id="arch"
            chart={`flowchart TB
    subgraph React["React SPA"]
        Lang[LangProvider]
        Db[DbProvider]
        Auth[AuthProvider]
        Router[BrowserRouter]
        Pages[Landing, Overview, Login, Dashboard, Training, Reports]
        Lang --> Db --> Auth --> Router --> Pages
    end
    subgraph Sim["Simulator"]
        Scene[SceneManager]
        Game[GameLogic]
        UI[UI]
        VR[VRManager]
        Scene --> Game
        UI --> Scene
        VR --> Scene
    end
    subgraph Storage["Storage"]
        LS[(localStorage)]
        SQL[(SQL.js)]
    end
    Pages -->|sessionId, traineeId| Sim
    Sim -->|lastSessionResult| LS
    Pages -->|read/write| SQL`}
          />
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            9. Use Case Diagram
          </h2>
          <MermaidDiagram
            id="usecase"
            chart={`flowchart LR
    subgraph Trainee["Trainee"]
        U((User))
    end
    subgraph System["Surgical Training System"]
        UC1[Login]
        UC2[Register]
        UC3[Dashboard]
        UC4[Start Training]
        UC5[Run Simulator]
        UC6[View Reports]
        UC7[Export CSV]
    end
    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5
    U --> UC6
    U --> UC7
    UC4 --> UC5
    UC5 --> UC6`}
          />
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            10. Class Diagram
          </h2>
          <MermaidDiagram
            id="class"
            chart={`classDiagram
    class SceneManager {
        -canvas
        -scene
        -camera
        -renderer
        +init()
        +onResize()
        +startDrag()
        +update()
    }
    class GameLogic {
        -scene
        -steps
        -currentStepIndex
        +start()
        +getCurrentStep()
        +tick()
        +advanceStep()
    }
    class UI {
        -refs
        -callbacks
        +render()
    }
    class VRManager {
        +enterVR()
        -handleSession()
    }
    class AuthContext {
        +user
        +login()
        +logout()
    }
    SceneManager --> GameLogic : uses
    GameLogic --> SceneManager : checks
    UI --> SceneManager : controls`}
          />
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            11. Sequence Diagram — Start Training
          </h2>
          <MermaidDiagram
            id="seq"
            chart={`sequenceDiagram
    participant U as User
    participant T as Training
    participant D as DbContext
    participant S as Simulator
    participant M as main.js
    U->>T: Click Start Training
    T->>D: Create SESSION
    D->>D: INSERT
    T->>S: redirect(sessionId, traineeId)
    S->>M: init
    M->>M: SceneManager.init()
    M->>M: GameLogic.start()`}
          />
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            12. Evaluation and Testing
          </h2>
          <Table
            headers={['Test Type', 'Description', 'Status']}
            rows={[
              ['Unit', 'validation.ts — validateEmail, validatePassword', 'Pass'],
              ['Integration', 'Login → Dashboard flow', 'Pass'],
              ['UI', 'Navigation, RTL, responsive', 'Pass'],
              ['Simulator', '14-step suturing procedure', 'Pass'],
              ['Database', 'CRUD, persistence in localStorage', 'Pass'],
              ['VR', 'WebXR session (when supported)', 'Pass'],
            ]}
          />
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            13. Conclusions and Future Enhancements
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">Conclusions</h3>
              <p className="text-teal-400 text-sm">
                The system delivers a complete surgical training environment: login, dashboard, 3D suturing simulator with VR support, and performance reports. Data is stored in MySQL (backend). All three presentation topics — System Architecture, Core Functionality, and Backend/Database — are fully implemented.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-100 mb-1">Future Enhancements</h3>
              <ul className="list-disc list-inside text-teal-400 text-sm space-y-1">
                <li>Additional surgical procedures beyond wound suturing</li>
                <li>Backend server with MySQL for multi-user data</li>
                <li>Physical VR headset support</li>
                <li>AI-based performance assessment</li>
                <li>PDF export for reports</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-teal-200 mb-3 border-b border-teal-700 pb-2">
            Full Report Document
          </h2>
          <p className="text-teal-400 text-sm mb-2">
            A complete graduation report covering all template sections (Planning, Analysis, Design, Implementation) is available at:
          </p>
          <code className="block bg-teal-900/60 border border-teal-700 rounded-lg px-3 py-2 text-teal-300 text-sm font-mono">
            docs/graduation-report.md
          </code>
        </section>

        <div className="flex flex-wrap gap-4 pt-6">
          <Link to="/overview" className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-semibold rounded-xl transition">
            نظرة عامة على المشروع
          </Link>
          <Link to="/" className="px-6 py-3 bg-teal-800 hover:bg-teal-700 border border-teal-600 rounded-xl transition">
            الرئيسية
          </Link>
        </div>
      </main>
    </div>
  );
}
