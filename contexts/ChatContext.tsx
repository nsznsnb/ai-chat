'use client';

/**
 * チャット状態管理用のReact Context
 * React Context + useReducerでの状態管理を実装
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Message, ChatSession } from '@/types/chat';
import { nanoid } from 'nanoid';

/**
 * アクションの型定義
 */
type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_SESSION' }
  | { type: 'ADD_USER_MESSAGE'; payload: string }
  | { type: 'ADD_ASSISTANT_MESSAGE'; payload: string };

/**
 * Context の型定義
 */
interface ChatContextType {
  state: ChatSession;
  dispatch: React.Dispatch<ChatAction>;
  // ヘルパー関数
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetSession: () => void;
}

/**
 * 初期状態
 */
const initialState: ChatSession = {
  messages: [],
  isLoading: false,
  error: null,
};

/**
 * Reducer関数
 */
function chatReducer(state: ChatSession, action: ChatAction): ChatSession {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null,
      };

    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: nanoid(),
            role: 'user',
            content: action.payload,
            timestamp: new Date(),
          },
        ],
        error: null,
      };

    case 'ADD_ASSISTANT_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: action.payload,
            timestamp: new Date(),
          },
        ],
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'RESET_SESSION':
      return initialState;

    default:
      return state;
  }
}

/**
 * Context作成
 */
const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Provider Props
 */
interface ChatProviderProps {
  children: ReactNode;
}

/**
 * ChatProvider コンポーネント
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // ヘルパー関数
  const addUserMessage = (content: string) => {
    dispatch({ type: 'ADD_USER_MESSAGE', payload: content });
  };

  const addAssistantMessage = (content: string) => {
    dispatch({ type: 'ADD_ASSISTANT_MESSAGE', payload: content });
  };

  const setLoading = (isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const resetSession = () => {
    dispatch({ type: 'RESET_SESSION' });
  };

  const value: ChatContextType = {
    state,
    dispatch,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setError,
    resetSession,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * useChat フック
 * ChatContextを使用するためのカスタムフック
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
