import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { useOperation } from '../src/hooks/useOperation';
import LoginScreen from '../src/screens/LoginScreen';
import RegisterScreen from '../src/screens/RegisterScreen';
import OperacionScreen from '../src/screens/OperacionScreen';

export default function Index() {
  const { user, loading, login, logout } = useAuth();
  const { operation, loading: opLoading, transition, modifyAmount, reportIncident } = useOperation(
    user?.id ?? null,
  );
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  if (showRegister) {
    return <RegisterScreen onBack={() => setShowRegister(false)} />;
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={login}
        onRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <OperacionScreen
      operation={operation}
      loading={opLoading}
      onTransition={transition}
      onModifyAmount={modifyAmount}
      onReportIncident={reportIncident}
      onLogout={logout}
    />
  );
}