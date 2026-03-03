import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { UserProfile } from '../types';
import LoginPage from './LoginPage';
import TermsPage from './TermsPage';
import PrivacyPage from './PrivacyPage';
import SafetyPage from './SafetyPage';
import FeaturedMembersPage from './FeaturedMembersPage';
import { useLandingPageSettings } from '../hooks/useLandingPageSettings';

// Add CSS animation for notification fade-in
const notificationStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;

// simple reusable icons for landing page (replaces previous emoji usage)
const ICON_SVG: Record<string,string> = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v12H5.17L4 17.17V4zm0-2c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.93 5h-3.03a13.98 13.98 0 00-1.2-3.74A8.017 8.017 0 0118.93 7zM12 4c.85 0 1.7.08 2.51.23A15.99 15.99 0 0013 9h-2A16.03 16.03 0 009.49 4.23 8.018 8.018 0 0112 4zm-4.5.26A13.98 13.98 0 007.06 7H4.03a8.017 8.017 0 013.47-2.74zM4 12c0-.35.02-.69.05-1h3.17a16.08 16.08 0 000 2H4.05c-.03-.31-.05-.65-.05-1zm.95 4h3.03a13.98 13.98 0 001.2 3.74A8.017 8.017 0 014.95 16zM12 20c-.85 0-1.7-.08-2.51-.23A15.99 15.99 0 0011 15h2a16.03 16.03 0 001.51 4.77c-.81.15-1.66.23-2.51.23zm4.5-.26A13.98 13.98 0 0016.94 17h3.03a8.017 8.017 0 01-3.47 2.74z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zm0 18H6V4h12v16z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l8 4v6c0 5-3.58 9.74-8 11-4.42-1.26-8-6-8-11V5l8-4z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-5.34C15.35 5.59 12.36 3 8.75 3S2.15 5.59 2.15 8.39C2.15 11.19 4.64 13.68 7.5 13.93a6.5 6.5 0 005.34-1.48l.27.28v.79l4.25 4.25c.39.39 1.02.39 1.41 0l.01-.01c.39-.39.39-1.02 0-1.41L15.5 14zm-6.75 0C6.01 14 4 11.99 4 8.75S6.01 3.5 8.75 3.5 13.5 5.51 13.5 8.75 11.49 14 8.75 14z"/></svg>',
  percent: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3l-1.41 1.41L5.41 16.59 4 18l5.17 5.17L16.59 6.41 19 3zm-9 0a2 2 0 110 4 2 2 0 010-4zm10 16a2 2 0 110 4 2 2 0 010-4z"/></svg>',
  couple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
};

const Icon: React.FC<{name:string; className?:string}> = ({name, className}) => {
  switch (name) {
    case 'heart':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
    case 'chat':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v12H5.17L4 17.17V4zm0-2c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"/></svg>;
    case 'user':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
    case 'globe':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.93 5h-3.03a13.98 13.98 0 00-1.20-3.74A8.017 8.017 0 0118.93 7zM12 4c.85 0 1.70.08 2.51.23A15.99 15.99 0 0013 9h-2A16.03 16.03 0 009.49 4.23 8.018 8.018 0 0112 4zm-4.50.26A13.98 13.98 0 007.06 7H4.03a8.017 8.017 0 013.47-2.74zM4 12c0-.35.02-.69.05-1h3.17a16.08 16.08 0 000 2H4.05c-.03-.31-.05-.65-.05-1zm.95 4h3.03a13.98 13.98 0 001.20 3.74A8.017 8.017 0 014.95 16zM12 20c-.85 0-1.70-.08-2.51-.23A15.99 15.99 0 0011 15h2a16.03 16.03 0 001.51 4.77c-.81.15-1.66.23-2.51.23zm4.50-.26A13.98 13.98 0 0016.94 17h3.03a8.017 8.017 0 01-3.47 2.74z"/></svg>;
    case 'book':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zm0 18H6V4h12v16z"/></svg>;
    case 'shield':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l8 4v6c0 5-3.58 9.74-8 11-4.42-1.26-8-6-8-11V5l8-4z"/></svg>;
    case 'search':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-5.34C15.35 5.59 12.36 3 8.75 3S2.15 5.59 2.15 8.39C2.15 11.19 4.64 13.68 7.5 13.93a6.5 6.5 0 005.34-1.48l.27.28v.79l4.25 4.25c.39.39 1.02.39 1.41 0l.01-.01c.39-.39.39-1.02 0-1.41L15.5 14zm-6.75 0C6.01 14 4 11.99 4 8.75S6.01 3.5 8.75 3.5 13.5 5.51 13.5 8.75 11.49 14 8.75 14z"/></svg>;
    case 'percent':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3l-1.41 1.41L5.41 16.59 4 18l5.17 5.17L16.59 6.41 19 3zm-9 0a2 2 0 110 4 2 2 0 010-4zm10 16a2 2 0 110 4 2 2 0 010-4z"/></svg>;
    case 'couple':
      return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
    default:
      return <span className={className} />;
  }
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  :root {
    --crimson: #C0162C;
    --rose: #E8335A;
    --blush: #F2708A;
    --petal: #FFB3C1;
    --dark: #110205;
    --deep: #1E0509;
    --card: #230609;
    --gold: #D4A853;
    --text-muted: rgba(255,255,255,0.45);
    --border: rgba(232,51,90,0.15);
  }

  .lp * { box-sizing: border-box; margin: 0; padding: 0; }

  .lp {
    font-family: 'DM Sans', sans-serif;
    background: var(--dark);
    color: #fff;
    overflow-x: hidden;
    contain: layout style paint;
  }

  /* NAV */
  .lp-nav {
    position: sticky;
    top: 0;
    z-index: 1000;
    padding: 1.2rem 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(17,2,5,0.92);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }

  .lp-logo {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    font-weight: 900;
    font-style: italic;
    background: linear-gradient(135deg, var(--gold) 0%, var(--petal) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .lp-traffic-lights {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .lp-heart-light {
    width: 1.6rem;
    height: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    opacity: 0;
    visibility: hidden;
  }

  .lp-heart-light.active {
    opacity: 1;
    visibility: visible;
  }

  /* Red/Rose Heart */
  .lp-heart-light.red.active {
    opacity: 1;
    visibility: visible;
    filter: drop-shadow(0 0 8px var(--rose)) drop-shadow(0 0 12px var(--rose));
  }
  .lp-heart-light.red svg {
    color: var(--rose);
    width: 100%;
    height: 100%;
  }

  /* Amber/Gold Heart */
  .lp-heart-light.amber.active {
    opacity: 1;
    visibility: visible;
    filter: drop-shadow(0 0 8px var(--gold)) drop-shadow(0 0 12px var(--gold));
  }
  .lp-heart-light.amber svg {
    color: var(--gold);
    width: 100%;
    height: 100%;
  }

  /* Green/Blush Heart */
  .lp-heart-light.green.active {
    opacity: 1;
    visibility: visible;
    filter: drop-shadow(0 0 8px var(--blush)) drop-shadow(0 0 12px var(--blush));
  }
  .lp-heart-light.green svg {
    color: var(--blush);
    width: 100%;
    height: 100%;
  }

  .lp-nav-btns { display: flex; gap: 0.8rem; align-items: center; flex-wrap: nowrap; overflow-x: auto; }
.lp-nav-btns > * { flex-shrink: 0; }

  .lp-hamburger {
    display: none;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.8rem;
    cursor: pointer;
  }

  .lp-btn-ghost {
    padding: 0.6rem 1.4rem;
    border: 1px solid rgba(255,255,255,0.15);
    background: transparent;
    color: rgba(255,255,255,0.7);
    border-radius: 50px;
    font-size: 0.9rem;
    font-weight: 400;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.3s;
    white-space: nowrap;
    min-width: 5.5rem;
  }
  .lp-btn-ghost:hover { border-color: var(--rose); color: var(--petal); }

  .lp-btn-primary {
    padding: 0.65rem 1.6rem;
    background: linear-gradient(135deg, var(--crimson), var(--rose));
    color: #fff;
    border: none;
    border-radius: 50px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 20px var(--primary-color-alpha-light-shadow, rgba(192,22,44,0.4));
    transition: all 0.3s;
    white-space: nowrap;
    min-width: 6rem;
  }
  .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px var(--primary-color-alpha-medium-shadow, rgba(192,22,44,0.6)); }

  /* HERO */
  .lp-hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 5% 3rem;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(30,5,9,0.85), rgba(17,2,5,0.9));
    gap: 2rem;
  }

  .lp-hero-video-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 0;
  }

  .lp-hero-video-iframe {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    border: none;
    pointer-events: none;
  }

  .lp-hero-video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(30,5,9,0.85), rgba(17,2,5,0.9));
    z-index: 1;
  }

  .lp-hero-content {
    position: relative;
    z-index: 2;
  }

  .lp-hero-profiles {
    position: relative;
    z-index: 2;
  }

  @media (min-width: 1024px) {
    .lp-hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: center;
      justify-content: space-between;
      padding: 4rem 5%;
      min-height: 95vh;
    }
  }

  .lp-hero-badge {
    display: none;
    align-items: center;
    gap: 0.6rem;
    background: linear-gradient(135deg, var(--primary-color-alpha-light-2, rgba(255, 71, 87, 0.18)), var(--primary-color-alpha-light-3, rgba(255, 107, 122, 0.12)));
    border: 1.5px solid var(--primary-color-alpha-border, rgba(255, 107, 122, 0.35));
    padding: 0.55rem 1.3rem;
    border-radius: 50px;
    font-size: 0.8rem;
    color: #FFB3C1;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 2rem;
    width: fit-content;
    font-weight: 600;
    box-shadow: 0 4px 15px var(--primary-color-alpha-shadow, rgba(255, 71, 87, 0.15));
  }

  @media (min-width: 1024px) {
    .lp-hero-badge {
      display: inline-flex;
    }
  }

  .lp-hero h1 {
    font-family: 'Playfair Display', serif;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -1.5px;
    margin-bottom: 1.5rem;
    color: #fff;
  }

  .lp-hero h1 em {
    font-style: italic;
    background: linear-gradient(135deg, var(--primary-color, #FF6B7A) 0%, var(--primary-color-light, #FFB3C1) 50%, var(--primary-color-lighter, #FFD4DB) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
    text-shadow: 0 4px 20px var(--primary-color-alpha-light, rgba(255, 71, 87, 0.2));
    filter: drop-shadow(0 4px 20px var(--primary-color-alpha-light-faded, rgba(255, 71, 87, 0.15)));
  }

  .lp-hero p {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.8;
    margin-bottom: 2rem;
    font-weight: 300;
    letter-spacing: 0.3px;
  }

  .lp-hero-cta {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 3rem;
  }

  .lp-cta-main {
    padding: 0.95rem 2.4rem;
    background: var(--primary-color, #FF4757);
    color: #fff;
    border: none;
    border-radius: 50px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 10px 35px var(--primary-color-alpha-shadow, rgba(255, 71, 87, 0.5));
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-decoration: none;
    display: inline-block;
    white-space: nowrap;
    min-width: 7rem;
    letter-spacing: 0.3px;
  }
  .lp-cta-main:hover { 
    transform: translateY(-4px); 
    box-shadow: 0 18px 45px var(--primary-color-alpha-shadow-dark, rgba(255, 71, 87, 0.7));
    background: var(--secondary-color, #FF7D8A);
  }
  .lp-cta-main:active { transform: translateY(-1px); }

  .lp-cta-ghost {
    padding: 0.95rem 2.2rem;
    background: rgba(255, 71, 87, 0.08);
    color: #fff;
    border: 1.5px solid rgba(255, 107, 122, 0.4);
    border-radius: 50px;
    font-size: 1.05rem;
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-decoration: none;
    display: inline-block;
    white-space: nowrap;
    min-width: 6.5rem;
  }
  .lp-cta-ghost:hover { 
    background: rgba(255, 107, 122, 0.15);
    border-color: rgba(255, 107, 122, 0.6);
    color: #FFB3C1;
    transform: translateY(-2px);
  }
  .lp-cta-ghost:active { transform: translateY(0px); }

  .lp-hero-stats {
    display: flex;
    gap: 2.5rem;
    padding-top: 2.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (min-width: 1024px) {
    .lp-hero-stats {
      justify-content: flex-start;
    }
  }

  .lp-stat-num {
    display: block;
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    font-weight: 900;
    background: linear-gradient(135deg, #FFB3C1 0%, #FF6B7A 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
  }

  .lp-stat-label {
    display: block;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 0.8px;
    margin-top: 0.25rem;
    text-transform: uppercase;
    font-weight: 500;
  }

  /* HERO CONTENT LEFT SIDE */
  .lp-hero-content {
    position: relative;
    z-index: 2;
    text-align: center;
    max-width: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    order: 2;
  }

  @media (min-width: 1024px) {
    .lp-hero-content {
      text-align: left;
      justify-content: flex-start;
      order: 1;
    }
  }

  /* HERO PROFILES CAROUSEL RIGHT SIDE */
  .lp-hero-profiles {
    display: flex;
    position: relative;
    height: 450px;
    width: 100%;
    max-width: 320px;
    align-items: center;
    justify-content: center;
    order: 1;
    margin-bottom: 1rem;
    touch-action: pan-y;
    cursor: grab;
  }
  
  .lp-hero-profiles:active {
    cursor: grabbing;
  }

  @media (min-width: 1024px) {
    .lp-hero-profiles {
      height: 680px;
      max-width: 520px;
      order: 2;
      margin-bottom: 0;
    }
  }

  .lp-profile-card {
    position: absolute;
    width: 260px;
    height: 360px;
    border-radius: 24px;
    overflow: hidden;
    background: #1E0509;
    border: 2px solid rgba(255, 107, 122, 0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;
    touch-action: pan-y;
    user-select: none;
  }

  @media (min-width: 1024px) {
    .lp-profile-card {
      width: 400px;
      height: 540px;
    }
  }

  .lp-profile-card.inactive {
    opacity: 0;
    pointer-events: none;
  }

  .lp-profile-card.active {
    opacity: 1;
    z-index: 10;
    transform: translateX(0) scale(1);
  }

  .lp-profile-card.prev {
    opacity: 0.5;
    z-index: 5;
    transform: translateX(-140px) scale(0.78);
  }

  .lp-profile-card.next {
    opacity: 0.5;
    z-index: 5;
    transform: translateX(140px) scale(0.78);
  }

  /* Desktop dissolve-to-granules effect */
  @media (min-width: 1024px) {
    .lp-profile-card.prev {
      animation: lpGranuleDissolveLeft 0.8s cubic-bezier(0.445, 0.05, 0.55, 0.95) forwards;
    }

    .lp-profile-card.next {
      animation: lpGranuleDissolveRight 0.8s cubic-bezier(0.445, 0.05, 0.55, 0.95) forwards;
    }

    .lp-profile-card.prev::before,
    .lp-profile-card.next::before {
      animation: lpGranuleParticles 0.8s ease-out forwards;
    }
  }

  @keyframes lpGranuleParticles {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 0;
      transform: scale(1.2);
    }
  }

  .lp-profile-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
  }

  .lp-profile-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #230609, #1E0509);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
  }

  .lp-profile-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    padding: 2rem 1.2rem 1rem;
    color: #fff;
    z-index: 3;
  }

  .lp-profile-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    color: #fff;
  }

  @media (min-width: 1024px) {
    .lp-profile-name {
      font-size: 1.5rem;
    }
  }

  .lp-profile-status {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.75);
    margin-top: 0.3rem;
  }

  .lp-online-badge {
    position: absolute;
    bottom: 1.2rem;
    right: 1.2rem;
    width: 16px;
    height: 16px;
    background: #4CAF50;
    border-radius: 50%;
    border: 2px solid #fff;
    z-index: 4;
  }

  .lp-profile-carousel-nav {
    position: absolute;
    bottom: -45px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.8rem;
    z-index: 20;
  }

  @media (min-width: 1024px) {
    .lp-profile-carousel-nav {
      bottom: -50px;
    }
  }

  .lp-profile-carousel-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 71, 87, 0.2);
    border: 1.5px solid rgba(255, 107, 122, 0.5);
    color: #FFB3C1;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lp-profile-carousel-btn:hover {
    background: rgba(255, 71, 87, 0.4);
    border-color: rgba(255, 107, 122, 0.8);
  }

  .lp-hero-img-wrap {
    position: relative;
    width: 420px;
    height: 520px;
  }

  .lp-hero-img {
    width: 320px;
    height: 420px;
    border-radius: 180px 180px 40px 40px;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    border: 3px solid rgba(232,51,90,0.25);
    box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(192,22,44,0.15);
  }

  /* SLIDER */
  .lp-slider-wrap {
    position: relative;
    width: 420px; /* make square-ish as in guide */
    height: 420px;
    border-radius: 50px; /* soft rounded corners similar to reference */
    overflow: hidden;
    border: 3px solid rgba(232,51,90,0.25);
    box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(192,22,44,0.15);
  }

  .lp-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.8s ease;
    background: linear-gradient(160deg, var(--deep), rgba(192,22,44,0.2));
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lp-slide.active { opacity: 1; }

  .lp-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .lp-slide-emoji {
    font-size: 5rem;
  }

  .lp-slider-dots {
    position: absolute;
    bottom: -28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
  }

  .lp-slider-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: none;
    cursor: pointer;
    transition: all 0.3s;
    padding: 0;
  }

  .lp-slider-dot.active {
    background: var(--rose);
    width: 20px;
    border-radius: 4px;
    box-shadow: 0 0 8px rgba(232,51,90,0.6);
  }

  .lp-slider-arrows {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 0.5rem;
    pointer-events: none;
  }

  .lp-slider-arrow {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(17,2,5,0.8);
    border: 1px solid var(--border);
    color: #fff;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: all;
    transition: all 0.3s;
  }

  .lp-slider-arrow:hover {
    background: var(--crimson);
    border-color: var(--rose);
  }

  /* SLIDE NAME TAG */
  .lp-slide-tag {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(17,2,5,0.85);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 50px;
    padding: 0.4rem 1rem;
    font-size: 0.8rem;
    color: var(--petal);
    white-space: nowrap;
    z-index: 2;
  }

  .lp-float-card {
    position: absolute;
    background: rgba(26,5,8,0.92);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.9rem 1.1rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }

  .lp-card-match {
    bottom: 60px;
    left: -20px;
    animation: lpFloat 3s ease-in-out infinite;
  }

  .lp-card-match-inner { display: flex; align-items: center; gap: 0.7rem; }

  .lp-match-avatar {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--rose), var(--crimson));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem;
  }
  .lp-match-avatar svg { width: 1.1rem; height: 1.1rem; fill: currentColor; }

  .lp-match-name { font-size: 0.75rem; color: var(--petal); font-weight: 500; }
  .lp-match-sub { font-size: 0.7rem; color: var(--text-muted); }

  .lp-card-online {
    top: 50px; right: -10px;
    animation: lpFloat 3s 1.5s ease-in-out infinite;
    text-align: center;
  }

  .lp-online-row { display: flex; align-items: center; gap: 0.4rem; }

  .lp-online-dot {
    width: 7px; height: 7px;
    background: #4ade80;
    border-radius: 50%;
    box-shadow: 0 0 6px #4ade80;
    animation: lpBlink 2s infinite;
  }

  @keyframes lpBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .lp-online-label { font-size: 0.7rem; color: var(--text-muted); }
  .lp-online-count { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: #fff; margin-top: 0.2rem; }

  @keyframes lpFloat {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  /* Desktop Granule Dissolve Animation */
  @keyframes lpGranuleDissolveRight {
    0% {
      opacity: 1;
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
    40% {
      opacity: 0.7;
    }
    70% {
      opacity: 0.3;
      clip-path: polygon(5% 8%, 95% 12%, 92% 88%, 8% 92%);
    }
    100% {
      opacity: 0;
      clip-path: polygon(10% 20%, 90% 15%, 85% 85%, 15% 90%);
      transform: translateX(120px) scale(0.7);
    }
  }

  @keyframes lpGranuleDissolveLeft {
    0% {
      opacity: 1;
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
    40% {
      opacity: 0.7;
    }
    70% {
      opacity: 0.3;
      clip-path: polygon(8% 12%, 92% 8%, 88% 92%, 5% 88%);
    }
    100% {
      opacity: 0;
      clip-path: polygon(15% 15%, 85% 20%, 90% 85%, 10% 90%);
      transform: translateX(-120px) scale(0.7);
    }
  }

  /* Granule particle effect overlay */
  .lp-profile-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle 2px at 15% 20%, rgba(192,22,44,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 45% 30%, rgba(232,51,90,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 75% 15%, rgba(242,112,138,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 25% 60%, rgba(192,22,44,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 65% 50%, rgba(232,51,90,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 85% 70%, rgba(242,112,138,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 35% 80%, rgba(192,22,44,0.4) 1px, transparent 2px),
      radial-gradient(circle 2px at 70% 85%, rgba(232,51,90,0.4) 1px, transparent 2px);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    border-radius: 24px;
    z-index: 2;
    opacity: 0;
    pointer-events: none;
  }

  /* DIVIDER */
  .lp-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(232,51,90,0.18), transparent);
    margin: 0 5%;
  }

  /* SECTIONS */
  .lp-section { padding: 6rem 5%; position: relative; }
  .lp-section-dark { background: var(--deep); }

  .lp-section-tag {
    display: inline-block;
    font-size: 0.7rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--rose);
    margin-bottom: 0.8rem;
  }

  .lp-section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.8rem, 3.5vw, 3rem);
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 1rem;
  }

  .lp-section-title em { font-style: italic; color: var(--rose); }

  .lp-section-sub {
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.7;
    font-weight: 300;
    max-width: 480px;
  }

  /* MEMBERS */
  .lp-members-section-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .lp-members-header {
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  .lp-members-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.2rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 1024px) {
    .lp-members-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .lp-member-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s;
    cursor: pointer;
    contain: layout style paint;
  }

  .lp-member-card:hover {
    border-color: rgba(232,51,90,0.4);
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  }

  .lp-member-img {
    width: 100%;
    height: 240px;
    position: relative;
    background: linear-gradient(160deg, var(--deep), rgba(192,22,44,0.2));
    overflow: hidden;
  }

  .lp-member-img img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover;
    object-position: center;
    display: block;
  }

  .lp-member-info { padding: 1rem; }

  .lp-member-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: #fff;
    margin-bottom: 0.2rem;
  }

  .lp-member-status { font-size: 0.75rem; color: var(--text-muted); }

  .lp-member-status span {
    display: inline-block;
    width: 6px; height: 6px;
    background: #4ade80;
    border-radius: 50%;
    margin-right: 0.4rem;
    vertical-align: middle;
  }

  /* STATS */
  .lp-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-top: 3.5rem;
  }

  .lp-stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
    contain: layout style paint;
  }

  .lp-stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(192,22,44,0.08), transparent);
  }

  .lp-stat-card-num {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--petal), var(--gold));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: block;
    margin-bottom: 0.5rem;
  }

  .lp-stat-card-label { font-size: 0.85rem; color: var(--text-muted); }

  /* LOCATIONS */
  .lp-locations-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-top: 3.5rem;
  }

  .lp-location-card {
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    height: 200px;
    cursor: pointer;
    border: 1px solid var(--border);
    transition: all 0.3s;
    contain: layout style paint;
  }

  .lp-location-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }

  .lp-location-card img { width: 100%; height: 100%; object-fit: cover; }

  .lp-location-placeholder {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, var(--deep), rgba(192,22,44,0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
  }

  .lp-location-overlay {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 1rem;
    background: linear-gradient(to top, rgba(17,2,5,0.95), transparent);
  }

  .lp-location-name { font-size: 0.85rem; font-weight: 500; color: #fff; }

  /* WHY CHOOSE TABS */
  .lp-tabs-btns {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
    justify-content: center;
    margin: 2.5rem 0;
  }

  .lp-tab-btn {
    padding: 0.65rem 1.5rem;
    border-radius: 50px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.3s;
  }

  .lp-tab-btn:hover { border-color: var(--rose); color: var(--petal); }

  .lp-tab-btn.active {
    background: linear-gradient(135deg, var(--crimson), var(--rose));
    border-color: transparent;
    color: #fff;
    box-shadow: 0 4px 20px rgba(192,22,44,0.4);
  }

  .lp-tab-content {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3rem;
    text-align: center;
    max-width: 800px;
    margin: 0 auto;
  }

  .lp-tab-icon { font-size: 3rem; margin-bottom: 1rem; }
  .lp-tab-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.8rem; }
  .lp-tab-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; font-weight: 300; }

  /* STORIES */
  .lp-stories-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-top: 3.5rem;
  }

  .lp-story-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s;
    cursor: pointer;
    contain: layout style paint;
  }

  .lp-story-card:hover { border-color: rgba(232,51,90,0.4); transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }

  .lp-story-thumb { height: 200px; overflow: hidden; position: relative; }
  .lp-story-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  .lp-story-card:hover .lp-story-thumb img { transform: scale(1.05); }

  .lp-story-placeholder {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, var(--deep), rgba(192,22,44,0.25));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
  }

  .lp-story-body { padding: 1.3rem; }
  .lp-story-cat { font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; color: var(--rose); margin-bottom: 0.5rem; display: block; }
  .lp-story-title { font-size: 0.95rem; font-weight: 500; color: #fff; line-height: 1.5; }

  /* TRUST CARDS */
  .lp-trust-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 3.5rem;
  }

  .lp-trust-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2.5rem;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
    contain: layout style paint;
  }

  .lp-trust-card:hover { border-color: rgba(232,51,90,0.35); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }

  .lp-trust-icon { font-size: 2rem; margin-bottom: 1rem; }
  .lp-trust-icon svg { width: 2rem; height: 2rem; fill: currentColor; }
  .lp-trust-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.7rem; }
  .lp-trust-desc { font-size: 0.9rem; color: var(--text-muted); line-height: 1.7; font-weight: 300; }

  /* CTA SECTION */
  .lp-cta-section {
    padding: 7rem 5%;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .lp-cta-section::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(192,22,44,0.15), transparent 70%);
    pointer-events: none;
  }

  .lp-cta-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 2.5rem; }

  /* FOOTER */
  .lp-footer { border-top: 1px solid rgba(255,255,255,0.06); }

  .lp-newsletter {
    padding: 4rem 5%;
    background: var(--deep);
    text-align: center;
  }

  .lp-newsletter h2 {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }

  .lp-newsletter-form {
    display: flex;
    gap: 0.8rem;
    max-width: 480px;
    margin: 0 auto;
    flex-wrap: wrap;
    justify-content: center;
  }

  .lp-newsletter-input {
    flex: 1;
    min-width: 220px;
    padding: 0.8rem 1.2rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    border-radius: 50px;
    color: #fff;
    font-size: 0.9rem;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.3s;
  }

  .lp-newsletter-input:focus { border-color: var(--rose); }
  .lp-newsletter-input::placeholder { color: var(--text-muted); }

  .lp-footer-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3rem;
    padding: 4rem 5% 2rem;
  }

  .lp-footer-col h4 {
    font-size: 0.9rem;
    font-weight: 500;
    color: #fff;
    margin-bottom: 1rem;
    letter-spacing: 0.5px;
  }

  .lp-footer-col p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.7; font-weight: 300; }

  .lp-footer-col ul { list-style: none; }
  .lp-footer-col ul li { margin-bottom: 0.6rem; }
  .lp-footer-col ul li a { font-size: 0.85rem; color: var(--text-muted); text-decoration: none; transition: color 0.3s; }
  .lp-footer-col ul li a:hover { color: var(--petal); }

  .lp-footer-bottom {
    padding: 1.5rem 5%;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .lp-footer-copy { font-size: 0.8rem; color: var(--text-muted); }

  /* modal styles */
  .lp-modal-backdrop {
  }
  .lp.modal-open {
    filter: blur(4px);
  }
  .lp-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }
  .lp-modal {
    background: var(--card);
    padding: 2rem;
    border-radius: 12px;
    max-width: 65%;
    width: auto;
    max-height: 85vh;
    overflow-y: auto;
    color: #fff;
  }
  .lp-modal h3 { margin-top: 0; }
  .lp-modal-body { margin: 1rem 0; }
  .lp-footer-copy a { color: var(--rose); text-decoration: none; }

  .lp-social-links { display: flex; gap: 0.8rem; }

  .lp-social-link {
    width: 34px; height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.85rem;
    transition: all 0.3s;
  }

  .lp-social-link:hover { border-color: var(--rose); color: var(--petal); background: rgba(192,22,44,0.1); }

  /* SECTION HEADERS */
  .lp-section-header { margin-bottom: 3.5rem; }
  .lp-section-header.centered { text-align: center; }
  .lp-section-header.centered .lp-section-sub { margin: 0 auto; }

  /* SLIDER */
  .lp-slider {
    position: relative;
    /* slightly wider rectangle per design request */
    width: 380px;
    height: 440px;
    margin: 0 auto;
  }

  .lp-slide {
    position: absolute;
    inset: 0;
    /* smooth, uniform rounded corners for a clean rectangle */
    border-radius: 50px;
    overflow: hidden;
    border: 3px solid rgba(232,51,90,0.25);
    box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(192,22,44,0.15);
    opacity: 0;
    transform: scale(0.96) translateY(10px);
    transition: opacity 0.8s ease, transform 0.8s ease;
    pointer-events: none;
  }

  .lp-slide.active {
    opacity: 1;
    transform: scale(1) translateY(0);
    pointer-events: auto;
  }

  .lp-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .lp-slide-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(160deg, var(--deep), rgba(192,22,44,0.3));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 6rem;
  }

  .lp-slider-dots {
    position: absolute;
    bottom: -28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
  }

  .lp-slider-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: none;
    cursor: pointer;
    transition: all 0.3s;
    padding: 0;
  }

  .lp-slider-dot.active {
    width: 20px;
    border-radius: 3px;
    background: var(--rose);
  }

  .lp-slider-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(26,5,8,0.8);
    border: 1px solid var(--border);
    color: rgba(255,255,255,0.7);
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    z-index: 10;
  }

  .lp-slider-nav:hover { background: var(--crimson); border-color: var(--rose); color: #fff; }
  .lp-slider-prev { left: -44px; }
  .lp-slider-next { right: -44px; }

  /* FLOATING HEARTS BG */
  .lp-hearts-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .lp-heart { position: absolute; opacity: 0.025; font-size: 2rem; animation: lpHeartFloat linear infinite; }
  .lp-heart svg { width: 2rem; height: 2rem; fill: currentColor; }
  .lp-hero-badge-icon { width: 1.2em; height: 1.2em; vertical-align: text-bottom; margin-right: 0.4em; fill: currentColor; }
  .lp-footer-heart { width: 1.2em; height: 1.2em; vertical-align: middle; fill: currentColor; }
  .lp-tab-icon svg { width: 2.4rem; height: 2.4rem; fill: currentColor; }
  .lp-stat-card span svg { width: 1.8rem; height: 1.8rem; fill: currentColor; }
  @keyframes lpHeartFloat {
    0% { transform: translateY(110vh) rotate(0deg); }
    100% { transform: translateY(-100px) rotate(360deg); }
  }

  /* RESPONSIVE */
  @media (max-width: 1024px) {
    .lp-members-grid { grid-template-columns: repeat(2, 1fr); }
    .lp-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .lp-locations-grid { grid-template-columns: repeat(3, 1fr); }
    .lp-footer-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 768px) {
    .lp-hero { padding: 2.5rem 4% 3rem; }
    .lp-hero-content { text-align: center; }
    .lp-hero h1 { font-size: clamp(2rem, 4vw, 2.8rem); line-height: 1.1; margin-bottom: 1rem; }
    .lp-hero p { font-size: 0.95rem; margin-bottom: 1.5rem; }
    .lp-hero-badge { font-size: 0.7rem; margin-bottom: 1rem; }
    .lp-hero-cta { flex-direction: column; gap: 0.6rem; width: 100%; }
    .lp-cta-main, .lp-cta-ghost { width: 100%; text-align: center; padding: 0.8rem 1.5rem; }
    .lp-hero-stats { gap: 1.5rem; padding-top: 1.5rem; justify-content: center; }
    .lp-stat-num { font-size: 1.4rem; }
    .lp-stat-label { font-size: 0.7rem; }
    .lp-stories-grid { grid-template-columns: 1fr; }
    .lp-trust-grid { grid-template-columns: 1fr; }
    .lp-locations-grid { grid-template-columns: repeat(2, 1fr); }
    .lp-footer-grid { grid-template-columns: 1fr; }
    .lp-footer-bottom { flex-direction: column; text-align: center; }
    
    /* Mobile features grid optimization */
    .lp-features-grid { gap: 1rem; padding: 0 3%; }
  }

  @media (max-width: 768px) {
    .lp-members-grid { grid-template-columns: 1fr 1fr; }
    .lp-stats-grid { grid-template-columns: 1fr 1fr; }
    .lp-locations-grid { grid-template-columns: 1fr 1fr; }

    /* show hamburger and hide nav buttons until toggled */
    .lp-hamburger { display: block; }
    .lp-nav-btns { display: none; }
    .lp-nav-btns.open { display: flex; position: absolute; top: 100%; right: 5%; flex-direction: column; background: rgba(17,2,5,0.95); padding: 1rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1001; }

    /* shrink nav buttons slightly and maintain spacing */
    .lp-nav-btns { gap: 0.5rem; }
    .lp-btn-ghost, .lp-btn-primary { padding: 0.45rem 1rem; font-size: 0.85rem; }
    .lp-cta-main, .lp-cta-ghost { padding: 0.7rem 1.6rem; font-size: 0.9rem; }
  }

  @media (max-width: 360px) {
    /* adjustments for extremely narrow phones */
    .lp-nav { padding: 1rem 3%; }
    .lp-logo { font-size: 1.4rem; }
    .lp-nav-btns { gap: 0.3rem; flex-wrap: wrap; justify-content: center; }
    .lp-btn-ghost, .lp-btn-primary { padding: 0.55rem 1rem; font-size: 0.8rem; }
    .lp-hero { padding: 1.5rem 3% 2rem; }
    .lp-hero h1 { font-size: 1.8rem; }
    .lp-hero p { font-size: 0.9rem; }
    .lp-hero-cta { gap: 0.5rem; }
    .lp-cta-main, .lp-cta-ghost { padding: 0.7rem 1.2rem; font-size: 0.85rem; }
    .lp-hero-stats { gap: 1.2rem; justify-content: space-around; }
    .lp-stat-num { font-size: 1.2rem; }
    
    /* Extra small phone feature cards */
    .lp-features-grid { gap: 0.8rem; padding: 0 2%; }
  }
`;

const tabContent: Record<number, { icon: React.ReactElement; title: string; desc: string }> = {
  0: { icon: <Icon name="search" />, title: 'Smart Partner Search', desc: 'Use advanced filters to find exactly who you are looking for — by location, interests, age, and more. Our intelligent search surfaces the most compatible people first.' },
  1: { icon: <Icon name="percent" />, title: '94% Compatibility Match', desc: 'Our matching algorithm analyzes your preferences, behavior, and profile to surface people you will genuinely connect with. Real compatibility, not just looks.' },
  2: { icon: <Icon name="couple" />, title: 'Find Your Partner', desc: 'Browse verified profiles, send likes, and start conversations with people who match your energy. Your next great love story starts with a single message.' },
  3: { icon: <Icon name="book" />, title: 'Live Success Stories', desc: 'Every day, real couples share how they found each other on LunesaLove. Read their journeys and let their stories inspire yours.' },
};

// Fallback profiles for when backend data is unavailable
const FALLBACK_PROFILES = [
  { id: '1', src: '/images/member/home3/01.jpg', name: 'Karim', age: 53, isOnline: true },
  { id: '2', src: '/images/member/home3/02.jpg', name: 'Sofia', age: 48, isOnline: true },
  { id: '3', src: '/images/member/home3/03.jpg', name: 'James', age: 45, isOnline: true },
  { id: '4', src: '/images/member/home3/04.jpg', name: 'Maria', age: 42, isOnline: true },
  { id: '5', src: '/images/member/home3/05.jpg', name: 'Ahmed', age: 50, isOnline: false },
  { id: '6', src: '/images/member/home3/06.jpg', name: 'Lisa', age: 46, isOnline: true },
];

// Initially static fallback slider images (will be replaced by backend data)
// fallback slider entries use icon names instead of emojis
interface Slide { src: string; icon: string; }
const FALLBACK_SLIDER: Slide[] = [
  { src: '/images/banner/shape/home3/03.png', icon: 'couple' },
  { src: '/images/banner/home3/01.jpg', icon: 'couple' },
  { src: '/images/banner/home3/02.jpg', icon: 'couple' },
  { src: '/images/banner/home3/03.jpg', icon: 'heart' },
  { src: '/images/about/home3/01.jpg', icon: 'heart' },
];

// slider images state will live inside the component now

// member list with icon key for fallback
const MEMBERS = [
  { name: 'Smith Johnson', status: 'Active 10 days ago', image: '/images/member/home3/01.jpg', icon: 'user' },
  { name: 'Arika Q Smith', status: 'Active 15 days ago', image: '/images/member/home3/02.jpg', icon: 'user' },
  { name: 'William R Show', status: 'Active 10 days ago', image: '/images/member/home3/03.jpg', icon: 'user' },
  { name: 'Hanna Marcovick', status: 'Active 10 days ago', image: '/images/member/home3/04.jpg', icon: 'user' },
  { name: 'James Okafor', status: 'Active 2 days ago', image: '/images/member/home3/05.jpg', icon: 'user' },
  { name: 'Sara Mitchell', status: 'Active today', image: '/images/member/home3/06.jpg', icon: 'user' },
  { name: 'Carlos Vega', status: 'Active 5 days ago', image: '/images/member/home3/07.jpg', icon: 'user' },
  { name: 'Amara Diallo', status: 'Active 3 days ago', image: '/images/member/home3/08.jpg', icon: 'user' },
];

const STATS = [
  { number: '2,000,000+', label: 'Members Worldwide', icon: <Icon name="user" /> },
  { number: '628,590', label: 'Members Online', icon: <Icon name="user" /> },
  { number: '314,587', label: 'Men Online', icon: <Icon name="user" /> },
  { number: '102,369', label: 'Women Online', icon: <Icon name="user" /> },
];

const LOCATIONS = [
  { name: 'London, UK', image: '/images/meet/icon/02.jpg', icon: 'globe' },
  { name: 'Barcelona, Spain', image: '/images/meet/icon/03.jpg', icon: 'globe' },
  { name: 'Taj Mahal, India', image: '/images/meet/icon/04.jpg', icon: 'globe' },
  { name: 'Dubai, UAE', image: '/images/meet/icon/05.jpg', icon: 'globe' },
  { name: 'Paris, France', image: '/images/meet/icon/06.jpg', icon: 'globe' },
];

const STORIES = [
  { title: 'Dream places to visit and fall in love in 2025', category: 'Entertainment', image: '/images/story/author/01.jpg', emoji: '✈️' },
  { title: 'How we met — a love story that started with one message', category: 'Love Stories', image: '/images/story/author/02.jpg', emoji: '💌' },
  { title: 'Love looks not with the eyes, but with the mind', category: 'Inspiration', image: '/images/story/author/03.jpg', emoji: '💭' },
];

const WHY_CHOOSE_TABS = [
  { label: 'Search Partner' },
  { label: '100% Match' },
  { label: 'Find Partner' },
  { label: 'Live Story' },
];

// ContactUs Modal Component
const ContactUsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ContactForm] Form submitted with data:', formData);
    setFormStatus('submitting');
    try {
      // Submit to backend API
      console.log('[ContactForm] Calling API endpoint: /support/submit');
      const response = await apiClient.post('/support/submit', formData);
      console.log('[ContactForm] API response:', response);
      if (response.success) {
        console.log('[ContactForm] Success! Closing modal...');
        setFormStatus('success');
        setTimeout(() => {
          setFormData({ name: '', email: '', subject: '', message: '' });
          setFormStatus('idle');
          onClose(); // Close modal after success
        }, 2000);
      } else {
        console.log('[ContactForm] API returned non-success');
        setFormStatus('error');
      }
    } catch (err) {
      console.error('[ContactForm] Error submitting contact form:', err);
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px' }}>
      <style>{`
        .contact-section { margin-bottom: 2rem; }
        .contact-section h4 { font-size: 1rem; font-weight: 600; color: var(--petal); margin-bottom: 0.8rem; }
        .contact-item { margin-bottom: 0.8rem; font-size: 0.9rem; }
        .contact-item a { color: var(--rose); text-decoration: none; }
        .contact-item a:hover { text-decoration: underline; }
        .contact-form { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.85rem; margin-bottom: 0.4rem; color: var(--text-muted); }
        .form-group input, .form-group textarea { width: 100%; padding: 0.6rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 0.4rem; color: #fff; font-family: inherit; }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--rose); background: rgba(232,51,90,0.1); }
        .submit-btn { background: var(--rose); color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 0.4rem; cursor: pointer; font-weight: 500; transition: background 0.3s; }
        .submit-btn:hover { background: var(--crimson); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-status { padding: 0.8rem; border-radius: 0.4rem; margin-bottom: 1rem; font-size: 0.9rem; }
        .form-success { background: rgba(76,175,80,0.2); color: #4CAF50; }
        .form-error { background: rgba(244,67,54,0.2); color: #F44336; }
        .social-icons { display: flex; gap: 0.8rem; margin-top: 0.8rem; }
        .social-icons a { display: inline-flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; background: rgba(232,51,90,0.15); border-radius: 50%; color: var(--petal); text-decoration: none; transition: background 0.3s; }
        .social-icons a:hover { background: rgba(232,51,90,0.3); }
      `}</style>

      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Get In Touch</h3>

      {/* Email Section */}
      <div className="contact-section">
        <h4>📧 Email Support</h4>
        <div className="contact-item">General: <a href="mailto:support@lunesalove.com">support@lunesalove.com</a></div>
        <div className="contact-item">Account Issues: <a href="mailto:accounts@lunesalove.com">accounts@lunesalove.com</a></div>
        <div className="contact-item">Safety & Abuse: <a href="mailto:safety@lunesalove.com">safety@lunesalove.com</a></div>
        <div className="contact-item">Business/Partners: <a href="mailto:business@lunesalove.com">business@lunesalove.com</a></div>
      </div>

      {/* Phone Section */}
      <div className="contact-section">
        <h4>📞 Phone Support</h4>
        <div className="contact-item">+1 (555) 123-4567</div>
        <div className="contact-item" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available: Mon-Fri, 9 AM - 6 PM EST</div>
      </div>

      {/* Support Hours */}
      <div className="contact-section">
        <h4>🕐 Support Hours</h4>
        <div className="contact-item">Monday - Friday: 9:00 AM - 6:00 PM (EST)</div>
        <div className="contact-item">Saturday: 10:00 AM - 4:00 PM (EST)</div>
        <div className="contact-item">Sunday: Closed</div>
        <div className="contact-item" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Response time: Usually within 24 hours</div>
      </div>

      {/* Live Chat & FAQ */}
      <div className="contact-section">
        <h4>💬 Quick Links</h4>
        <div className="contact-item"><a href="#" onClick={e => e.preventDefault()}>💻 Start Live Chat</a> (Available during support hours)</div>
        <div className="contact-item"><a href="#" onClick={e => e.preventDefault()}>❓ View FAQ</a></div>
      </div>

      {/* Social Media */}
      <div className="contact-section">
        <h4>📱 Follow Us</h4>
        <div className="social-icons">
          <a href="https://twitter.com/lunesalove" target="_blank" rel="noopener noreferrer" title="Twitter"><i className="fa-brands fa-twitter" /></a>
          <a href="https://instagram.com/lunesalove" target="_blank" rel="noopener noreferrer" title="Instagram"><i className="fa-brands fa-instagram" /></a>
          <a href="https://facebook.com/lunesalove" target="_blank" rel="noopener noreferrer" title="Facebook"><i className="fa-brands fa-facebook" /></a>
          <a href="https://linkedin.com/company/lunesalove" target="_blank" rel="noopener noreferrer" title="LinkedIn"><i className="fa-brands fa-linkedin" /></a>
        </div>
      </div>

      {/* Contact Form */}
      <form className="contact-form" onSubmit={handleFormSubmit}>
        <h4>📝 Send Us a Message</h4>
        {formStatus === 'success' && <div className="form-status form-success">✓ Message sent successfully! We'll respond soon.</div>}
        {formStatus === 'error' && <div className="form-status form-error">✗ Error sending message. Please try again.</div>}
        
        <div className="form-group">
          <label>Name</label>
          <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Message</label>
          <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} required />
        </div>
        <button type="submit" className="submit-btn" disabled={formStatus === 'submitting'}>
          {formStatus === 'submitting' ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      <button style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--border)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '0.4rem', cursor: 'pointer' }} onClick={onClose}>Close</button>
    </div>
  );
};

export function LandingPageContent({ currentUser, onOpenLoginModal }: { currentUser: UserProfile | null; onOpenLoginModal?: () => void }) {
  // Fetch admin-configured landing page settings
  const { settings: landingSettings } = useLandingPageSettings();
  
  const [activeTab, setActiveTab] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sliderImages, setSliderImages] = useState<Array<{ id: string; src: string; name: string; age: number; isOnline: boolean }>>(FALLBACK_PROFILES);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [autoSlideEnabled, setAutoSlideEnabled] = useState(true);
  const [trafficLightState, setTrafficLightState] = useState<'red' | 'amber' | 'green'>('red');
  const [appNotification, setAppNotification] = useState<{message: string; type: 'ios' | 'android'} | null>(null);
  // modal state for footer links
  // modal payload may be simple text or a full component
  type ModalPayload =
    | { title: string; body: string }
    | { component: React.ReactElement };
  const [modalInfo, setModalInfo] = useState<ModalPayload | null>(null);
  const navigate = useNavigate();

  // Apply admin colors to CSS variables
  useEffect(() => {
    if (landingSettings?.primaryColor) {
      const primaryColor = landingSettings.primaryColor;
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      
      // Derive lighter versions for gradients (simplified - uses same color for now)
      document.documentElement.style.setProperty('--primary-color-light', primaryColor);
      document.documentElement.style.setProperty('--primary-color-lighter', primaryColor);
      document.documentElement.style.setProperty('--primary-color-alpha-light', `${primaryColor}29`); // 16% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-light-2', `${primaryColor}2D`); // 18% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-light-3', `${primaryColor}1F`); // 12% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-med', `${primaryColor}0F`); // 6% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-border', `${primaryColor}59`); // 35% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-shadow', `${primaryColor}26`); // 15% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-shadow-dark', `${primaryColor}B3`); // 70% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-light-shadow', `${primaryColor}66`); // 40% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-medium-shadow', `${primaryColor}99`); // 60% alpha
      document.documentElement.style.setProperty('--primary-color-alpha-light-faded', `${primaryColor}26`); // 15% alpha
    }
    if (landingSettings?.secondaryColor) {
      document.documentElement.style.setProperty('--secondary-color', landingSettings.secondaryColor);
    }
  }, [landingSettings]);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (appNotification) {
      const timer = setTimeout(() => {
        setAppNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appNotification]);

  // Traffic light animation - 15 second cycle (4s Red, 4s Amber, 4s Green, 3s Amber)
  useEffect(() => {
    const trafficLightSequence = [
      { state: 'red' as const, duration: 4000 },
      { state: 'amber' as const, duration: 4000 },
      { state: 'green' as const, duration: 4000 },
      { state: 'amber' as const, duration: 3000 },
    ];
    let currentIndex = 0;

    const switchLight = () => {
      setTrafficLightState(trafficLightSequence[currentIndex].state);
      const nextIndex = (currentIndex + 1) % trafficLightSequence.length;
      const currentDuration = trafficLightSequence[currentIndex].duration;
      
      setTimeout(() => {
        currentIndex = nextIndex;
        switchLight();
      }, currentDuration);
    };

    switchLight();
  }, []);

  // Fetch random profiles from backend for hero carousel
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // First try to use admin-configured member images
        if (landingSettings?.memberImages && landingSettings.memberImages.length > 0) {
          const profiles = landingSettings.memberImages.slice(0, 6).map((img: any, idx: number) => ({
            id: img.imageUrl + idx,
            src: img.imageUrl,
            name: img.name || img.title || 'Member',
            age: parseInt(img.description || '25') || 25,
            isOnline: idx % 2 === 0,
          }));
          setSliderImages(profiles);
          setLoading(false);
          return;
        }
        
        // Fallback to random users from API
        const response = await apiClient.get('/users/random?limit=6');
        if (response.data && Array.isArray(response.data)) {
          const profiles = response.data.map((user: any) => ({
            id: user._id || Math.random().toString(),
            src: user.profilePicture || '/images/member/home3/01.jpg',
            name: user.username || user.firstName || 'Fellow',
            age: user.age || 30,
            isOnline: user.isOnline !== false,
          }));
          if (profiles.length > 0) {
            setSliderImages(profiles);
          }
        }
      } catch (err) {
        // Use fallback on error
        console.log('Using fallback profiles', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [landingSettings]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock scroll when modal is open
  useEffect(() => {
    if (modalInfo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [modalInfo]);

  // must define closeModal before it's referenced in FOOTER_MODAL_DATA
  const closeModal = () => setModalInfo(null);

  // map footer link texts to modal content
  const FOOTER_MODAL_DATA: Record<string, {title:string; body:string} | {component: React.ReactElement}> = {
    'Top Members': { component: <FeaturedMembersPage currentUser={currentUser} filterType="top" isModal onClose={closeModal} onOpenLoginModal={onOpenLoginModal} /> },
    'New Members': { component: <FeaturedMembersPage currentUser={currentUser} filterType="new" isModal onClose={closeModal} onOpenLoginModal={onOpenLoginModal} /> },
    'Online Now': { component: <FeaturedMembersPage currentUser={currentUser} filterType="online" isModal onClose={closeModal} onOpenLoginModal={onOpenLoginModal} /> },
    'Contact Us': { component: <ContactUsModal onClose={closeModal} /> },
    'FAQ': { title: 'FAQ', body: 'Find answers to frequently asked questions about accounts, matching, and safety.' },
    'Privacy Policy': { component: <PrivacyPage onAccept={closeModal} isModal onClose={closeModal} /> },
    'Terms of Service': { component: <TermsPage onAccept={closeModal} isModal onClose={closeModal} /> },
    'Safety Tips': { component: <SafetyPage isModal onClose={closeModal} /> },
    'Photo Verification': { component: <SafetyPage isModal onClose={closeModal} /> },
    'Report User': { component: <SafetyPage isModal onClose={closeModal} /> },
    'Block User': { component: <SafetyPage isModal onClose={closeModal} /> },
    'Log In': { component: <LoginPage isModal onClose={closeModal} /> },
    'Sign Up': { component: <LoginPage isModal initialMode="signup" onClose={closeModal} /> },
  };

  const openFooterModal = (key: string) => {
    const data = FOOTER_MODAL_DATA[key];
    if (data) setModalInfo(data as ModalPayload);
  };

  // Slider auto-rotation with pause on user interaction
  useEffect(() => {
    if (!autoSlideEnabled || sliderImages.length < 2) return;

    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % sliderImages.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [sliderImages.length, autoSlideEnabled]);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setAutoSlideEnabled(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    setTimeout(() => setAutoSlideEnabled(true), 5000); // Resume auto-slide after 5s
  };

  const handleSlide = () => {
    const swipeThreshold = 50;
    const difference = touchStart - touchEnd;

    if (Math.abs(difference) > swipeThreshold) {
      if (difference > 0) {
        // Swiped left - go to next
        setActiveSlide(prev => (prev + 1) % sliderImages.length);
      } else {
        // Swiped right - go to previous
        setActiveSlide(prev => (prev - 1 + sliderImages.length) % sliderImages.length);
      }
    }
  };

  useEffect(() => {
    if (touchStart && touchEnd) {
      handleSlide();
    }
  }, [touchEnd]);

  // Pause auto-slide on manual navigation
  const handleManualNavigation = (callback: () => void) => {
    callback();
    setAutoSlideEnabled(false);
    setTimeout(() => setAutoSlideEnabled(true), 5000);
  };

  const handleAuth = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    setMenuOpen(false);
    if (onOpenLoginModal) { onOpenLoginModal(); } else { navigate('/login'); }
  }, [onOpenLoginModal, navigate]);

  return (
    <>
      <style>{styles}</style>

      {/* Floating hearts - optimized */}
      <div className="lp-hearts-bg">
        {[10, 25, 45, 65, 80].map((left, i) => (
          <span key={i} className="lp-heart" style={{ left: `${left}%`, animationDuration: `${12 + i * 3}s`, animationDelay: `${i * 2}s`, willChange: 'transform' }}><Icon name="heart" className="lp-heart-icon" /></span>
        ))}
      </div>

      <div className={`lp${modalInfo ? ' modal-open' : ''}`}>

        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <span>LunesaLove</span>
            <div className="lp-traffic-lights">
              <div className={`lp-heart-light red ${trafficLightState === 'red' ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div className={`lp-heart-light amber ${trafficLightState === 'amber' ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div className={`lp-heart-light green ${trafficLightState === 'green' ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
            </div>
          </div>
          <button
            className="lp-hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            &#9776;
          </button>
          <div className={`lp-nav-btns${menuOpen ? ' open' : ''}`}>
            <button className="lp-btn-ghost" onClick={handleAuth}>
              Log In
            </button>
            <button className="lp-btn-primary" onClick={handleAuth}>
              Sign Up Free
            </button>
          </div>
        </nav>

        {/* Menu Backdrop - closes menu when tapped */}
        {menuOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              background: 'transparent'
            }}
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* HERO */}
        <section className="lp-hero">
          {/* VIDEO BACKGROUND */}
          {landingSettings.heroVideoUrl && (
            (() => {
              // Extract video ID from various YouTube URL formats
              let videoId = landingSettings.heroVideoUrl;
              
              // If it's a full URL, extract the video ID
              if (landingSettings.heroVideoUrl.includes('youtube.com/embed/')) {
                videoId = landingSettings.heroVideoUrl.split('/embed/')[1]?.split('?')[0] || '';
              } else if (landingSettings.heroVideoUrl.includes('youtube.com/watch?v=')) {
                videoId = landingSettings.heroVideoUrl.split('v=')[1]?.split('&')[0] || '';
              } else if (landingSettings.heroVideoUrl.includes('youtu.be/')) {
                videoId = landingSettings.heroVideoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
              }
              
              const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playlist=${videoId}`;
              
              return (
                <div className="lp-hero-video-container">
                  <iframe
                    className="lp-hero-video-iframe"
                    src={embedUrl}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    style={{
                      opacity: landingSettings.heroVideoOpacity || 0.5,
                    }}
                  />
                  <div
                    className="lp-hero-video-overlay"
                    style={{
                      opacity: landingSettings.heroVideoTransparency || 0.3,
                      background: `linear-gradient(135deg, rgba(30,5,9,${(landingSettings.heroVideoTransparency || 0.3) * 0.85}), rgba(17,2,5,${(landingSettings.heroVideoTransparency || 0.3) * 0.9}))`,
                    }}
                  />
                </div>
              );
            })()
          )}

          {/* LEFT SIDE - CONTENT */}
          <div className="lp-hero-content">
            <div className="lp-hero-badge"><Icon name="heart" className="lp-hero-badge-icon" /> 2,000,000+ Members Worldwide</div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', margin: '0 0 1.2rem 0' }}>
              {landingSettings.heroTitle || 'Find Your Forever Starts Here'}
            </h1>
            <p style={{ marginBottom: '1.8rem' }}>
              {landingSettings.heroSubtitle || 'Still looking for your significant other? LunesaLove is the place for you. Join now to meet single men and women worldwide who are serious about love.'}
            </p>
            <div className="lp-hero-cta">
              <a href="#" className="lp-cta-main" onClick={handleAuth}>{landingSettings.heroCtaText || 'Registration Now'}</a>
              <a href="#" className="lp-cta-ghost" onClick={handleAuth}>Log In</a>
            </div>
            <div className="lp-hero-stats">
              <div><span className="lp-stat-num">2M+</span><span className="lp-stat-label">Members</span></div>
              <div><span className="lp-stat-num">94%</span><span className="lp-stat-label">Match Rate</span></div>
              <div><span className="lp-stat-num">50K+</span><span className="lp-stat-label">Couples Formed</span></div>
            </div>
          </div>

          {/* RIGHT SIDE - PROFILE CAROUSEL */}
          <div 
            className="lp-hero-profiles"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {sliderImages.length > 0 && (
              <>
                {sliderImages.map((profile, idx) => {
                  const getCardClass = () => {
                    if (idx === activeSlide) return 'active';
                    if (idx === (activeSlide - 1 + sliderImages.length) % sliderImages.length) return 'prev';
                    if (idx === (activeSlide + 1) % sliderImages.length) return 'next';
                    return 'inactive';
                  };

                  return (
                    <div key={profile.id} className={`lp-profile-card ${getCardClass()}`}>
                      <img 
                        src={profile.src} 
                        alt={profile.name}
                        className="lp-profile-card-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML += '<div class="lp-profile-placeholder">👤</div>';
                        }}
                      />
                      {profile.isOnline && <div className="lp-online-badge" />}
                      <div className="lp-profile-info">
                        <div className="lp-profile-name">{profile.name}, {profile.age}</div>
                      </div>
                    </div>
                  );
                })}

                <div className="lp-profile-carousel-nav">
                  <button 
                    className="lp-profile-carousel-btn"
                    onClick={() => handleManualNavigation(() => setActiveSlide(prev => (prev - 1 + sliderImages.length) % sliderImages.length))}
                  >
                    ‹
                  </button>
                  <button 
                    className="lp-profile-carousel-btn"
                    onClick={() => handleManualNavigation(() => setActiveSlide(prev => (prev + 1) % sliderImages.length))}
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="lp-divider" />

        {/* FEATURES SHOWCASE SECTION */}
        <section className="lp-section lp-section-dark">
          <div className="lp-section-header centered">
            <span className="lp-section-tag">Platform Features</span>
            <h2 className="lp-section-title">Everything You Need to <em>Find Love</em></h2>
          </div>

          <div className="lp-features-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1.5rem',
            marginTop: '3rem'
          }}>
            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <circle cx="11" cy="8" r="1"></circle>
                  <path d="M11 11v3"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Smart Matching</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>AI-powered algorithm that matches you with compatible singles based on interests, values, and preferences.</p>
            </div>

            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#1DA1F2" stroke="#1DA1F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Verified Profiles</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>All members go through strict photo verification to ensure authenticity and prevent catfishing.</p>
            </div>

            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Instant Messaging</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Real-time messaging with photos, emojis, and read receipts to keep conversations flowing smoothly.</p>
            </div>

            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Video Chat</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Get to know matches better with secure video calls before meeting in person.</p>
            </div>

            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Safe & Secure</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>24/7 moderation, encrypted messaging, and blocking features keep you protected.</p>
            </div>

            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Global Community</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Connect with singles from over 150 countries and explore matches worldwide.</p>
            </div>

            <div style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 10.26 24 10.27 17.18 16.7 20.16 24.92 12 18.49 3.84 24.92 6.82 16.7 0 10.27 8.91 10.26 12 2"></polygon>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>Premium Perks</h3>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Unlimited likes, see who liked you, advanced filters, and priority visibility.</p>
            </div>
          </div>
        </section>

        <div className="lp-divider" />
        <section className="lp-section lp-section-dark">
          <div className="lp-members-section-wrapper">
            <div className="lp-members-header lp-section-header centered">
              <span className="lp-section-tag">Our Community</span>
              <h2 className="lp-section-title">Only <em>True People</em></h2>
              <p className="lp-section-sub">
                Learn from them and try to make it to this board. This will for sure boost your visibility and increase your chances to find your loved one.
              </p>
            </div>

            <div className="lp-members-grid">
            {MEMBERS.map((member, idx) => (
              <div key={idx} className="lp-member-card">
                <div className="lp-member-img">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      const svg = ICON_SVG[member.icon] || ICON_SVG.user;
                      el.parentElement!.innerHTML = `<span style="font-size:3rem">${svg}</span>`;
                    }}
                  />
                </div>
                <div className="lp-member-info">
                  <div className="lp-member-name">{member.name}</div>
                  <div className="lp-member-status"><span></span>{member.status}</div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>



        {/* LOCATIONS */}
        <section className="lp-section lp-section-dark">
          <div className="lp-section-header centered">
            <span className="lp-section-tag">Global Reach</span>
            <h2 className="lp-section-title">Meet Singles From <em>Around The World</em></h2>
          </div>

          <div className="lp-locations-grid">
            {(landingSettings.meetImages?.length > 0 ? landingSettings.meetImages : LOCATIONS).map((loc, idx) => (
              <div key={idx} className="lp-location-card">
                <img
                  src={loc.imageUrl || loc.image}
                  alt={loc.caption || loc.name}
                  loading="lazy"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    const svg = ICON_SVG[loc.icon] || ICON_SVG.globe;
                    el.parentElement!.innerHTML = `<div class="lp-location-placeholder">${svg}</div><div class="lp-location-overlay"><div class="lp-location-name">${loc.caption || loc.name}</div></div>`;
                  }}
                />
                <div className="lp-location-overlay">
                  <div className="lp-location-name">{loc.caption || loc.name}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="lp-divider" />

        {/* WHY CHOOSE */}
        <section className="lp-section">
          <div className="lp-section-header centered">
            <span className="lp-section-tag">Why Us</span>
            <h2 className="lp-section-title">Why Choose <em>LunesaLove</em></h2>
            <p className="lp-section-sub">Everything you need to find real love — in one place.</p>
          </div>

          <div className="lp-tabs-btns">
            {WHY_CHOOSE_TABS.map((tab, idx) => (
              <button
                key={idx}
                className={`lp-tab-btn${activeTab === idx ? ' active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="lp-tab-content">
            <div className="lp-tab-icon">{tabContent[activeTab].icon}</div>
            <div className="lp-tab-title">{tabContent[activeTab].title}</div>
            <div className="lp-tab-desc">{tabContent[activeTab].desc}</div>
          </div>
        </section>

        <div className="lp-divider" />

        {/* SUCCESS STORIES */}
        <section className="lp-section lp-section-dark">
          <div className="lp-section-header centered">
            <span className="lp-section-tag">Love Stories</span>
            <h2 className="lp-section-title">Success <em>Stories</em></h2>
            <p className="lp-section-sub">Read real stories from our happy members who found love on LunesaLove.</p>
          </div>

          <div className="lp-stories-grid">
            {(landingSettings.storyImages?.length > 0 ? landingSettings.storyImages : STORIES).map((story, idx) => (
              <div key={idx} className="lp-story-card">
                <div className="lp-story-thumb">
                  <img
                    src={story.imageUrl || story.image}
                    alt={story.title}
                    loading="lazy"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      const svg = ICON_SVG[story.icon] || ICON_SVG.book;
                      el.parentElement!.innerHTML = `<div class="lp-story-placeholder">${svg}</div>`;
                    }}
                  />
                </div>
                <div className="lp-story-body">
                  <span className="lp-story-cat">{story.category || 'Love Stories'}</span>
                  <div className="lp-story-title">{story.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="lp-divider" />

        {/* TRUST & SAFETY */}
        <section className="lp-section">
          <div className="lp-section-header centered">
            <span className="lp-section-tag">Your Safety Matters</span>
            <h2 className="lp-section-title">Built On <em>Trust</em></h2>
          </div>

          <div className="lp-trust-grid">
            <div className="lp-trust-card">
              <div className="lp-trust-icon"><Icon name="shield" /></div>
              <div className="lp-trust-title">Trust & Safety</div>
              <div className="lp-trust-desc">We prioritize your safety with advanced verification, secure messaging, and 24/7 moderation to ensure every member is authentic and real.</div>
            </div>
            <div className="lp-trust-card">
              <div className="lp-trust-icon">✨</div>
              <div className="lp-trust-title">Premium Membership</div>
              <div className="lp-trust-desc">Unlock unlimited messaging, see who liked you, advanced search filters, and other premium features to enhance your dating experience.</div>
            </div>
          </div>
        </section>

        <div className="lp-divider" />

        {/* CTA */}
        <section className="lp-cta-section">
          <span className="lp-section-tag">Begin Today</span>
          <h2 className="lp-section-title" style={{ maxWidth: '600px', margin: '0 auto 1rem' }}>
            Your Love Story is <em>Waiting</em> to Be Written
          </h2>
          <p className="lp-section-sub" style={{ margin: '0 auto', textAlign: 'center' }}>
            Join over 2 million singles who took the leap. Sign up free — no credit card needed.
          </p>
          <div className="lp-cta-btns">
            <button className="lp-cta-main" onClick={handleAuth}>Create Free Account</button>
            <button className="lp-cta-ghost" onClick={handleAuth}>Log In</button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-newsletter">
            <h2>Subscribe to Our Newsletter</h2>
            <form className="lp-newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" className="lp-newsletter-input" required />
              <button type="submit" className="lp-btn-primary">Subscribe</button>
            </form>
          </div>

          <div className="lp-footer-grid">
            <div className="lp-footer-col">
              <h4>About LunesaLove</h4>
              <p>We are a leading dating platform connecting singles worldwide. Find your forever with us.</p>
            </div>
            <div className="lp-footer-col">
              <h4>Featured Members</h4>
              <ul>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Top Members'); }}>Top Members</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('New Members'); }}>New Members</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Online Now'); }}>Online Now</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Contact Us'); }}>Contact Us</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('FAQ'); }}>FAQ</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Privacy Policy'); }}>Privacy Policy</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Terms of Service'); }}>Terms of Service</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Log In'); }}>Log In</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Sign Up'); }}>Sign Up</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Safety & Trust</h4>
              <ul>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Safety Tips'); }}>Safety Tips</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Photo Verification'); }}>Photo Verification</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Report User'); }}>Report User</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('Block User'); }}>Block User</a></li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Download Our App</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#777' }}>Get LunesaLove on the go</p>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <a href="#" target="_blank" rel="noopener noreferrer" onClick={(e) => {
                  e.preventDefault();
                  setAppNotification({message: 'App Coming Soon! Keep your eye on our newsletter for updates.', type: 'ios'});
                }} style={{ display: 'inline-block', cursor: 'pointer' }}>
                  <img 
                    src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                    alt="Download on App Store" 
                    style={{ height: '40px', width: 'auto' }}
                  />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" onClick={(e) => {
                  e.preventDefault();
                  setAppNotification({message: 'App Coming Soon! Keep your eye on our newsletter for updates.', type: 'android'});
                }} style={{ display: 'inline-block', cursor: 'pointer' }}>
                  <img 
                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                    alt="Get it on Google Play" 
                    style={{ height: '40px', width: 'auto' }}
                  />
                </a>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <p className="lp-footer-copy">All Rights Reserved © <a href="#">LunesaLove</a> 2026 · Made with <Icon name="heart" className="lp-footer-heart" /></p>
            <div className="lp-social-links">
              <a href="#" className="lp-social-link" title="Follow on Twitter"><i className="fa-brands fa-x-twitter" /></a>
              <a href="#" className="lp-social-link" title="Follow on Instagram"><i className="fa-brands fa-instagram" /></a>
              <a href="#" className="lp-social-link" title="Follow on Facebook"><i className="fa-brands fa-facebook" /></a>
              <a href="#" className="lp-social-link" title="Follow on TikTok"><i className="fa-brands fa-tiktok" /></a>
            </div>
          </div>
        </footer>

      </div>

      {/* App Notification Toast */}
      {appNotification && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: '#333',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(236, 72, 153, 0.3)',
          fontSize: '0.95rem',
          fontWeight: '500',
          zIndex: 2001,
          animation: 'fadeIn 0.3s ease-in-out',
          border: '2px solid',
          borderColor: appNotification.type === 'ios' ? '#555' : '#3ddc84',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          maxWidth: '90%'
        }}>
          {appNotification.type === 'ios' ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#555">
              <path d="M18.71 19.71L12.41 13.41C13.89 11.89 14.76 9.90 14.76 7.64C14.76 3.82 11.94 1 8.1 1C4.29 1 1.47 3.82 1.47 7.64C1.47 11.46 4.29 14.28 8.1 14.28C10.36 14.28 12.35 13.41 13.87 11.93L20.17 18.23C20.51 18.57 21.05 18.57 21.39 18.23L18.71 15.55C19.05 15.89 19.05 16.43 18.71 16.77L21.39 19.45C21.05 19.79 20.51 19.79 20.17 19.45L18.71 19.71Z"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#3ddc84">
              <path d="M7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.1 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5.5C20.95 5.34 21 5.17 21 5C21 4.45 20.55 4 20 4H5.21L4.27 2H1ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18Z"/>
            </svg>
          )}
          <span>{appNotification.message}</span>
        </div>
      )}

      {/* Modal rendered OUTSIDE the blurred div */}
      {modalInfo && (
        <div className="lp-modal-backdrop" onClick={closeModal}>
          <div className="lp-modal" style={{
            background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(55, 65, 81, 0.95) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            boxShadow: '0 20px 60px rgba(236, 72, 153, 0.2)'
          }} onClick={e => e.stopPropagation()}>
            {'component' in modalInfo ? (
              modalInfo.component
            ) : (
              <>
                <h3 style={{ color: '#fff' }}>{modalInfo.title}</h3>
                <div className="lp-modal-body" style={{ color: '#e5e7eb' }}>{modalInfo.body}</div>
                <button className="lp-btn-primary" onClick={closeModal}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const LandingPageWithStyles: React.FC<{ currentUser: UserProfile | null; onOpenLoginModal?: () => void }> = (props) => {
  // Fetch dynamic landing page settings from admin panel
  const { settings: landingSettings } = useLandingPageSettings();
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = notificationStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  return <LandingPageContent {...props} />;
};

export default React.memo(LandingPageWithStyles);