import React from 'react';
import { useParams } from 'wouter';
import JitsiCall from '../components/JitsiCall';

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || 'demo-room';

  return (
    <div className="p-4 min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">SkillSwap Live Video Call</h1>
      <JitsiCall sessionId={id} userName="User" />
    </div>
  );
}