import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import LoginPage from './LoginPage';

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
    box-shadow: 0 4px 20px rgba(192,22,44,0.4);
    transition: all 0.3s;
    white-space: nowrap;
    min-width: 6rem;
  }
  .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(192,22,44,0.6); }

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

  .lp-hero::before {
    content: '';
    position: absolute;
    top: -20%;
    right: -5%;
    width: 65vw;
    height: 110vh;
    background: radial-gradient(ellipse, rgba(192,22,44,0.18) 0%, rgba(232,51,90,0.06) 50%, transparent 70%);
    pointer-events: none;
  }

  .lp-hero-badge {
    display: none;
    align-items: center;
    gap: 0.6rem;
    background: linear-gradient(135deg, rgba(255, 71, 87, 0.18), rgba(255, 107, 122, 0.12));
    border: 1.5px solid rgba(255, 107, 122, 0.35);
    padding: 0.55rem 1.3rem;
    border-radius: 50px;
    font-size: 0.8rem;
    color: #FFB3C1;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 2rem;
    width: fit-content;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(255, 71, 87, 0.15);
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
    background: linear-gradient(135deg, #FF6B7A 0%, #FFB3C1 50%, #FFD4DB 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
    text-shadow: 0 4px 20px rgba(255, 71, 87, 0.2);
    filter: drop-shadow(0 4px 20px rgba(255, 71, 87, 0.15));
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
    background: linear-gradient(135deg, #FF4757, #FF6B7A);
    color: #fff;
    border: none;
    border-radius: 50px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 10px 35px rgba(255, 71, 87, 0.5);
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-decoration: none;
    display: inline-block;
    white-space: nowrap;
    min-width: 7rem;
    letter-spacing: 0.3px;
  }
  .lp-cta-main:hover { 
    transform: translateY(-4px); 
    box-shadow: 0 18px 45px rgba(255, 71, 87, 0.7);
    background: linear-gradient(135deg, #FF5A66, #FF7D8A);
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
    max-width: 90%;
    width: 400px;
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
  }
`;

const tabContent: Record<number, { icon: JSX.Element; title: string; desc: string }> = {
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

function LandingPageContent({ onOpenLoginModal }: { onOpenLoginModal?: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sliderImages, setSliderImages] = useState<Array<{ id: string; src: string; name: string; age: number; isOnline: boolean }>>(FALLBACK_PROFILES);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [autoSlideEnabled, setAutoSlideEnabled] = useState(true);
  const [trafficLightState, setTrafficLightState] = useState<'red' | 'amber' | 'green'>('red');
  // modal state for footer links
  // modal payload may be simple text or a full component
  type ModalPayload =
    | { title: string; body: string }
    | { component: JSX.Element };
  const [modalInfo, setModalInfo] = useState<ModalPayload | null>(null);
  const navigate = useNavigate();

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
        console.log('Using fallback profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // must define closeModal before it's referenced in FOOTER_MODAL_DATA
  const closeModal = () => setModalInfo(null);

  // map footer link texts to modal content
  const FOOTER_MODAL_DATA: Record<string, {title:string; body:string} | {component: JSX.Element}> = {
    'Top Members': { title: 'Top Members', body: 'Browse profiles of our most active and popular members on LunesaLove.' },
    'New Members': { title: 'New Members', body: 'Meet the newest singles who have just joined the platform.' },
    'Online Now': { title: 'Online Now', body: 'See who is currently online and available to chat in real time.' },
    'Contact Us': { title: 'Contact Us', body: 'Reach out to our support team at support@l unesalove.com or use the live chat widget.' },
    'FAQ': { title: 'FAQ', body: 'Find answers to frequently asked questions about accounts, matching, and safety.' },
    'Privacy Policy': { title: 'Privacy Policy', body: 'Learn how we protect your data and respect your privacy on LunesaLove.' },
    'Terms of Service': { title: 'Terms of Service', body: 'Read the rules and guidelines that govern use of our platform.' },
    '10 new members online': { title: 'New Members Online', body: '10 new members are currently browsing profiles on the site.' },
    '5 new success stories': { title: 'Success Stories', body: 'Five couples have recently shared how they met through LunesaLove.' },
    '2 verified profiles': { title: 'Verified Profiles', body: 'Two profiles were just verified by our moderation team for authenticity.' },
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

        {modalInfo && (
          <div className="lp-modal-backdrop" onClick={closeModal}>
            <div className="lp-modal" onClick={e => e.stopPropagation()}>
              {'component' in modalInfo ? (
                modalInfo.component
              ) : (
                <>
                  <h3>{modalInfo.title}</h3>
                  <div className="lp-modal-body">{modalInfo.body}</div>
                  <button className="lp-btn-primary" onClick={closeModal}>Close</button>
                </>
              )}
            </div>
          </div>
        )}

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

        {/* HERO */}
        <section className="lp-hero">
          {/* LEFT SIDE - CONTENT */}
          <div className="lp-hero-content">
            <div className="lp-hero-badge"><Icon name="heart" className="lp-hero-badge-icon" /> 2,000,000+ Members Worldwide</div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', margin: '0 0 1.2rem 0' }}>
              Find Your<br />
              <em>Forever</em><br />
              Starts Here
            </h1>
            <p style={{ marginBottom: '1.8rem' }}>
              Still looking for your significant other? LunesaLove is the place for you.
              Join now to meet single men and women worldwide who are serious about love.
            </p>
            <div className="lp-hero-cta">
              <a href="#" className="lp-cta-main" onClick={handleAuth}>Registration Now</a>
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

        {/* MEMBERS */}
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
            {LOCATIONS.map((loc, idx) => (
              <div key={idx} className="lp-location-card">
                <img
                  src={loc.image}
                  alt={loc.name}
                  loading="lazy"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    const svg = ICON_SVG[loc.icon] || ICON_SVG.globe;
                    el.parentElement!.innerHTML = `<div class="lp-location-placeholder">${svg}</div><div class="lp-location-overlay"><div class="lp-location-name">${loc.name}</div></div>`;
                  }}
                />
                <div className="lp-location-overlay">
                  <div className="lp-location-name">{loc.name}</div>
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
            {STORIES.map((story, idx) => (
              <div key={idx} className="lp-story-card">
                <div className="lp-story-thumb">
                  <img
                    src={story.image}
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
                  <span className="lp-story-cat">{story.category}</span>
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
              <h4>Recent Activity</h4>
              <ul>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('10 new members online'); }}>10 new members online</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('5 new success stories'); }}>5 new success stories</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); openFooterModal('2 verified profiles'); }}>2 verified profiles</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <p className="lp-footer-copy">All Rights Reserved © <a href="#">LunesaLove</a> 2026 · Made with <Icon name="heart" className="lp-footer-heart" /></p>
            <div className="lp-social-links">
              <a href="#" className="lp-social-link"><i className="fa-brands fa-twitter" /></a>
              <a href="#" className="lp-social-link"><i className="fa-brands fa-instagram" /></a>
              <a href="#" className="lp-social-link"><i className="fa-brands fa-facebook-messenger" /></a>
              <a href="#" className="lp-social-link"><i className="fa-brands fa-dribbble" /></a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

export default React.memo(LandingPageContent);