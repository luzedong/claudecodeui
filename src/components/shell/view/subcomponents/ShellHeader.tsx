type ShellHeaderProps = {
  isConnected: boolean;
  isInitialized: boolean;
  isRestarting: boolean;
  hasSession: boolean;
  sessionDisplayNameShort: string | null;
  statusNewSessionText: string;
  statusInitializingText: string;
  statusRestartingText: string;
};

export default function ShellHeader({
  isConnected,
  isInitialized,
  isRestarting,
  hasSession,
  sessionDisplayNameShort,
  statusNewSessionText,
  statusInitializingText,
  statusRestartingText,
}: ShellHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />

          {hasSession && sessionDisplayNameShort && (
            <span className="text-xs text-blue-300">({sessionDisplayNameShort}...)</span>
          )}

          {!hasSession && <span className="text-xs text-gray-400">{statusNewSessionText}</span>}

          {!isInitialized && (
            <span className="text-xs text-yellow-400">{statusInitializingText}</span>
          )}

          {isRestarting && <span className="text-xs text-blue-400">{statusRestartingText}</span>}
        </div>

        {/* 操作按钮区暂时留空，未来需要再补 */}
        <div className="flex items-center space-x-3" />
      </div>
    </div>
  );
}
