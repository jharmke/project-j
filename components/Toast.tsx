import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';

interface Toast {
  id: number;
  message: string;
  submessage?: string;
  type?: 'success' | 'info' | 'error';
}

interface ToastContextType {
  showToast: (message: string, submessage?: string, type?: 'success' | 'info' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(120)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const panY      = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 120, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, []);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) panY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 40) {
        dismiss();
      } else {
        Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  // Slide in
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  // Auto dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        Animated.timing(slideAnim, { toValue: 120, duration: 300, useNativeDriver: true }).start(() => onDismiss());
      });
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const accentColor = toast.type === 'success' ? theme.accentGreen : toast.type === 'error' ? theme.statusBad : theme.accentBlue;

  return (
    <Animated.View
      style={[styles.toast, {
        backgroundColor: theme.bgSheet,
        borderColor: theme.borderSubtle,
        transform: [{ translateY: Animated.add(slideAnim, panY) }],
        opacity: fadeAnim,
      }]}
      {...panResponder.panHandlers}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.message, { color: theme.textPrimary }]}>{toast.message}</Text>
        {toast.submessage ? (
          <Text style={[styles.submessage, { color: theme.textMuted }]}>{toast.submessage}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.close}>
        <Ionicons name="close" size={14} color={theme.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const ToastListContext = createContext<{ toasts: Toast[]; dismiss: (id: number) => void; keyboardVisible: boolean }>({
  toasts: [],
  dismiss: () => {},
  keyboardVisible: false,
});

export function ToastRenderer() {
  const { toasts, dismiss, keyboardVisible } = useContext(ToastListContext);
  return (
    <View style={[styles.container, keyboardVisible ? { top: 60 } : { bottom: 100 }]} pointerEvents="box-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const showToast = useCallback((message: string, submessage?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = counter.current++;
    setToasts(prev => [...prev, { id, message, submessage, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastListContext.Provider value={{ toasts, dismiss, keyboardVisible }}>
      <ToastContext.Provider value={{ showToast }}>
        {children}
        <View style={[styles.container, keyboardVisible ? { top: 60 } : { bottom: 100 }]} pointerEvents="box-none">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </View>
      </ToastContext.Provider>
    </ToastListContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginHorizontal: 12,
  },
  message: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  submessage: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  close: {
    padding: 4,
    marginLeft: 8,
  },
});