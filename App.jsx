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
    const unsubP = onSnapshot(query(collection(db, "players")), (s) => 
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name, 'ko-KR')))
    );
    const unsubM = onSnapshot(query(collection(db, "matches"), orderBy("timestamp", "desc")), (s) => 
      setMatches(s.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() })))
    );
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
      if (!m.timestamp) return false;
      if (rankPeriod === '연간') return m.timestamp.getFullYear() === now.getFullYear();
      if (rankPeriod === '월간') return m.timestamp.getFullYear() === now.getFullYear() && m.timestamp.getMonth() === now.getMonth();
      return true;
    });
    
    const points = {};
    players.forEach(p => points[p.name] = 0);
    filtered.forEach(m => {
      if (m.type === '단식') {
        m.participants?.forEach(p => { if(points[p] !== undefined) points[p] += 1; });
        if(points[m.winner] !== undefined) points[m.winner] += 1;
      } else {
        [...m.teamA, ...m.teamB].forEach(p => { if(points[p] !== undefined) points[p] += 1; });
        if(m.winner === 'teamA') m.teamA.forEach(p => { if(points[p] !== undefined) points[p] += 1; });
        else if(m.winner === 'teamB') m.teamB.forEach(p => { if(points[p] !== undefined) points[p] += 1; });
      }
    });
    return Object.entries(points).sort((a,b) => b[1] - a[1]);
  };

  const getMatchDisplay = (m) => {
    if (m.type === '단식') {
      const loser = m.participants.find(p => p !== m.winner);
      return `단식: ${m.winner} (승) vs ${loser} (패)`;
    }
    const winners = m.winner === 'teamA' ? m.teamA : m.teamB;
    const losers = m.winner === 'teamA' ? m.teamB : m.teamA;
    return `복식: ${winners.join(', ')} (승) vs ${losers.join(', ')} (패)`;
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
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 mb-4 font-medium border border-blue-100">
              승점: 참가시 1점, 승리시 1점
            </div>
            <div className="flex gap-2 mb-4">
              {['월간', '연간'].map(p => (
                <button key={p} onClick={() => setRankPeriod(p)} className={`px-4 py-1 rounded-full text-sm font-bold ${rankPeriod === p ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{p}</button>
              ))}
            </div>
            {calculatePoints().map(([name, pts], i) => (
              <div key={name} className="flex justify-between py-2 border-b"><span>{i + 1}위: {name}</span><span className="font-bold text-blue-600">{pts}점</span></div>
            ))}
          </div>
        )}

        {activeTab === '경기기록' && matches.map(m => (
          <div key={m.id} className="flex justify-between items-center py-2 border-b text-sm">
            <div>
              <div className="font-bold">{getMatchDisplay(m)}</div>
              <div className="text-xs text-gray-400">{m.timestamp?.toLocaleString()}</div>
            </div>
            <button onClick={() => deleteDoc(doc(db, "matches", m.id))} className="text-red-500 text-lg">🗑️</button>
          </div>
        ))}

        {activeTab === '단식' && (
          <div className="space-y-4">
            <h3 className="font-bold">1. 참가 선수 2명 선택</h3>
            <div className="grid grid-cols-2 gap-2">{players.map(p => <button key={p.id} onClick={() => setMatch({...match, participants: match.participants.includes(p.name) ? match.participants.filter(x=>x!==p.name) : [...match.participants, p.name], winner: ""})} className={`p-2 border rounded ${match.participants.includes(p.name) ? 'bg-blue-500 text-white' : 'bg-white'}`}>{p.name}</button>)}</div>
            {match.participants.length === 2 && (
              <>
                <h3 className="font-bold">2. 승리 선수 선택</h3>
                {match.participants.map(p => <button key={p} onClick={() => setMatch({...match, winner: p})} className={`w-full p-2 border rounded ${match.winner === p ? 'bg-green-500 text-white' : ''}`}>{p}</button>)}
                <button disabled={!match.winner} onClick={() => saveMatch('단식')} className={`w-full p-3 mt-4 rounded-lg font-bold ${match.winner ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>기록 저장</button>
              </>
            )}
          </div>
        )}

        {activeTab === '복식' && (
          <div className="space-y-4">
            <h3 className="font-bold text-blue-600">팀 A (2명)</h3>
            <div className="grid grid-cols-2 gap-2">{players.map(p => <button key={p.id} onClick={() => setMatch({...match, teamA: match.teamA.includes(p.name) ? match.teamA.filter(x=>x!==p.name) : (match.teamA.length < 2 && !match.teamB.includes(p.name) ? [...match.teamA, p.name] : match.teamA), winner: ""})} className={`p-2 border rounded ${match.teamA.includes(p.name) ? 'bg-blue-500 text-white' : 'bg-white'}`}>{p.name}</button>)}</div>
            <h3 className="font-bold text-red-600">팀 B (2명)</h3>
            <div className="grid grid-cols-2 gap-2">{players.map(p => <button key={p.id} onClick={() => setMatch({...match, teamB: match.teamB.includes(p.name) ? match.teamB.filter(x=>x!==p.name) : (match.teamB.length < 2 && !match.teamA.includes(p.name) ? [...match.teamB, p.name] : match.teamB), winner: ""})} className={`p-2 border rounded ${match.teamB.includes(p.name) ? 'bg-red-500 text-white' : 'bg-white'}`}>{p.name}</button>)}</div>
            {match.teamA.length === 2 && match.teamB.length === 2 && (
              <>
                <h3 className="font-bold">승리 팀 선택</h3>
                <div className="flex gap-2"><button onClick={() => setMatch({...match, winner: 'teamA'})} className={`flex-1 p-2 border rounded ${match.winner === 'teamA' ? 'bg-green-500 text-white' : ''}`}>팀 A</button><button onClick={() => setMatch({...match, winner: 'teamB'})} className={`flex-1 p-2 border rounded ${match.winner === 'teamB' ? 'bg-green-500 text-white' : ''}`}>팀 B</button></div>
                <button disabled={!match.winner} onClick={() => saveMatch('복식')} className={`w-full p-3 mt-4 rounded-lg font-bold ${match.winner ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>기록 저장</button>
              </>
            )}
          </div>
        )}

        {activeTab === '선수명단' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input className="flex-1 border p-2 rounded" placeholder="이름 입력" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
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