import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import amplifyconfig from './amplifyconfiguration.json';
import './App.css';

// Configure Amplify
Amplify.configure(amplifyconfig);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="App-header">
            <h1>Data Table Manager</h1>
            <p>Welcome, {user?.signInDetails?.loginId}!</p>
            <button onClick={signOut}>Sign out</button>
          </header>
          <main>
            <p>Data Table Manager application is ready for development.</p>
            <p>Authentication is configured and working.</p>
          </main>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
