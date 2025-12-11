/**
 * ローディングインジケーター
 * AIの応答待ち状態を視覚的に表示
 */


interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function LoadingIndicator({
  size = 'medium',
  className = ''
}: LoadingIndicatorProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex space-x-1">
        <div
          className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`}
          style={{ animationDelay: '0ms' }}
        />
        <div
          className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`}
          style={{ animationDelay: '150ms' }}
        />
        <div
          className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`}
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-sm text-gray-500">応答を待っています...</span>
    </div>
  );
}
