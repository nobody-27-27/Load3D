import { Sidebar } from './components/Sidebar';
import { Scene3D } from './components/Scene3D';

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1">
        <Scene3D />
      </div>
    </div>
  );
}

export default App;
