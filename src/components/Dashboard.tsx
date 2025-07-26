import React from 'react';
import { Chain, ScheduledSession } from '../types';
import { ChainCard } from './ChainCard';
import { Plus, Target } from 'lucide-react';

interface DashboardProps {
  chains: Chain[];
  scheduledSessions: ScheduledSession[];
  onCreateChain: () => void;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewChainDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  chains,
  scheduledSessions,
  onCreateChain,
  onStartChain,
  onScheduleChain,
  onViewChainDetail,
  onCancelScheduledSession,
  onDeleteChain,
}) => {
  const getScheduledSession = (chainId: string) => {
    return scheduledSessions.find(session => session.chainId === chainId);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Target className="text-orange-400" size={32} />
            <h1 className="text-4xl font-bold text-white">Momentum</h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            利用心理学原理，通过微小承诺和连续记录，帮助你建立强大的习惯链条
          </p>
        </header>

        {chains.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-800 rounded-2xl p-12 max-w-md mx-auto border border-gray-700">
              <Target className="text-gray-500 mx-auto mb-6" size={48} />
              <h2 className="text-2xl font-semibold text-white mb-4">创建你的第一条链</h2>
              <p className="text-gray-400 mb-8">
                链代表你想要持续做的任务。每次成功完成，你的记录就会增长一点。
              </p>
              <button
                onClick={onCreateChain}
                className="bg-orange-500 hover:bg-orange-400 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>创建第一条链</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold text-white">你的任务链</h2>
              <button
                onClick={onCreateChain}
                className="bg-orange-500 hover:bg-orange-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>新建链</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chains.map(chain => (
                <ChainCard
                  key={chain.id}
                  chain={chain}
                  scheduledSession={getScheduledSession(chain.id)}
                  onStartChain={onStartChain}
                  onScheduleChain={onScheduleChain}
                  onViewDetail={onViewChainDetail}
                  onCancelScheduledSession={onCancelScheduledSession}
                  onDelete={onDeleteChain}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};