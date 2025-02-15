import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return (
    <div>
      <Header />
      <Footer />
    </div>
  );
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

function Footer() {
  return <footer className="footer">Footer</footer>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

