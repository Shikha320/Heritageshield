import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <h2 style={styles.logo}>🛡️ Monument Protection</h2>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>
        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/alerts" style={styles.link}>Alerts</Link>
        <Link to="/history" style={styles.link}>History</Link>
        <Link to="/reports" style={styles.link}>Reports</Link>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#1e1e1e',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #333',
  },
  logo: {
    color: '#fff',
    margin: 0,
    fontSize: '1.5rem',
  },
  links: {
    display: 'flex',
    gap: '2rem',
  },
  link: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '1.1rem',
    transition: 'color 0.3s',
  },
};

export default Navbar;