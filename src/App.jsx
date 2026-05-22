import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_qBNmAxYPyjYqMwF9B_Mlk_kIKDLY378",
  authDomain: "gri-table-tennis.firebaseapp.com",
  projectId: "gri-table-tennis",
  storageBucket: "gri-table-tennis.firebasestorage.app",
  messagingSenderId: "319102517878",
  appId: "1:319102517878:web:0183e4db3b21517cf09557"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [activeTab, setActiveTab] = useState('순위');
  const [rankPeriod, setRankPeriod] = useState('연간');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [match, setMatch] = useState({ participants: [], teamA: [], teamB: [], winner: "" });
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    const unsubP = onSnapshot(query(collection(db, "players")), (s) => {
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubM = onSnapshot(query(collection(db, "matches"), orderBy("timestamp", "desc")), (s) => {
      setMatches(s.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data, 
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date() 
        };
      }));
    });
    return () => { unsubP(); unsubM(); };
  }, []);

  const addPlayer = async () => {
    if (newPlayerName.trim()) {
      await addDoc(collection(db, "players"), { name: newPlayerName.trim() });
      setNewPlayerName("");
    }
  };

  const saveMatch = async (type) => {
    if (!match.winner) return;
    const data = type === '단식' 
      ? { participants: match.participants, winner: match.winner, type } 
      : { teamA: match.teamA, teamB: match.teamB, winner: match.winner, type };
    await addDoc(collection(db, "matches"), { ...data, timestamp: new Date() });
    setMatch({ participants: [], teamA: [], teamB: [], winner: "" });
  };

  const calculatePoints = () => {
    const now = new Date();
    const filtered = matches.filter(m => {
      const date = m.timestamp || new Date();
      if (rankPeriod === '연간') return date.getFullYear() === now.getFullYear();
      if (rankPeriod === '월간') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      return true;
    });
    
    const points = {};
    players.forEach(p => points[p.name] = 0);
    filtered.forEach(m => {
      if (m.type === '단식') {
        m.participants?.forEach(p => { if(points[p] !== undefined) points[p] += 1; });
        if(points[m.winner] !== undefined) points[m.winner] += 1;
      } else {
        [...(m.teamA || []), ...(m.teamB || [])].forEach(p => { if(points[p] !== undefined) points[p] += 1; });
        if(m.winner === 'teamA') m.teamA?.forEach(p => { if(points[p] !== undefined) points[p] += 1; });
        else if(m.winner === 'teamB') m.teamB?.forEach(p => { if(points[p] !== undefined) points[p] += 1; });
      }
    });
    return Object.entries(points).sort((a,b) => b[1] - a[1]);
  };

  return (
    <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-blue-700 mb-6 text-center">2026 GRI 탁구왕</h1>
      <nav className="flex justify-between mb-6 bg-white p-2 rounded-xl shadow-sm text-xs md:text-sm">
        {['순위', '단식', '복식', '경기기록', '선수명단'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 py-2 rounded-lg font-bold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>{tab}</button>
        ))}
      </nav>

      <div className="bg-white p-6 rounded-2xl shadow-lg">
        {activeTab === '순위' && (
          <div>
            {calculatePoints().map(([name, pts], i) => (
              <div key={name} className="flex justify-between py-2 border-b"><span>{i + 1}위: {name}</span><span className="font-bold text-blue-600">{pts}점</span></div>
            ))}
          </div>
        )}

        {activeTab === '선수명단' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input className="flex-1 border p-2 rounded" placeholder="이름" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
              <button onClick={addPlayer} className="bg-blue-600 text-white px-4 rounded">추가</button>
            </div>
            {players.map(p => (
              <div key={p.id} className="flex justify-between p-2 border-b">{p.name} <button onClick={() => deleteDoc(doc(db, "players", p.id))} className="text-red-500 text-xs">삭제</button></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
