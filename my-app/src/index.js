import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  const [activeComponent, setActiveComponent] = useState('Home'); // Default to Home

  return (
    <div>
      <Clubs />
      <Header />
      <Centre setActiveComponent={setActiveComponent} />
      {activeComponent === 'Home' && <Home />}
      {activeComponent === 'Rules' && <Rules />}
      {activeComponent === 'Prices' && <Prices />}
      <Footer />
    </div>
  );
}

function Clubs() {
  // Add other clubs logos here
  return <div className="club-logo">
    <h1 className="clubs-title">Clubs</h1>
    <img className="club-logo" src="//upload.wikimedia.org/wikipedia/fr/thumb/9/96/Logo_Wydad_Athletic_Club.png/130px-Logo_Wydad_Athletic_Club.png" alt="Wydad AC Casablanca" />
    <img className="club-logo" src="//upload.wikimedia.org/wikipedia/en/b/be/Raja_Casablanca_Logo.png" alt="Raja Casablanca" />
  </div>;
}

function Header() {
  const headers = [
    { text: "Botola Pro", link: "/" },
    { text: "Fantasy", link: "/fantasy" },
    { text: "About", link: "/about" },
    { text: "More", link: "/more" },
  ];
  return <header className="header">
    {headers.map((header) =>  
      <a href={header.link}>{header.text}</a>
    )}
    </header>;
}

function Centre({ setActiveComponent }) {
  return <div className="centre">
    <div className="buttons">
      <button onClick={() => setActiveComponent('Home')}>Home</button>
      <button onClick={() => setActiveComponent('Rules')}>Rules</button>
      <button onClick={() => setActiveComponent('Prices')}>Prices</button>
      <button onClick={() => setActiveComponent('Statistics')}>Statistics</button>
    </div>
  </div>;
}

function Home() {
  return <div className="home">
    <div className="login">
      <input type="text" placeholder="Username" className="login-input" />
      <input type="password" placeholder="Password" className="login-input" />
      <button className="sign-in-button">
       Sign In
      </button>
    </div>
  </div>;
}

function Rules() {
  return <div className="rules">
    <h1>Rules</h1>
    <p>The rules of the game are simple. You need to predict the results of the matches and score points. The more matches you predict correctly, the more points you will score.</p>
  </div>;
}

function Prices() {
  return <div className="prices">
    <h1>Prices</h1>
    <p>Tji lewel trb7 7awya a wld l97ba</p>
    </div>
}

function Footer() {
  return <footer className="footer">
    <p>Copyright 2025</p>
  </footer>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

