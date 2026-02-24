/**
 * Vendor Libraries Initialization
 * All external libraries are imported here to leverage Vite's module bundling
 * and dynamic import capabilities for better loading performance
 */

// jQuery - imported globally for legacy code compatibility
import $ from 'jquery';
(window as any).$ = $;
(window as any).jQuery = $;

// Bootstrap - imported for component functionality
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

// Swiper - for carousel/slider functionality
import Swiper from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
(window as any).Swiper = Swiper;

// Isotope - for filtering layouts
import Isotope from 'isotope-layout';
(window as any).Isotope = Isotope;

// Initialize vendors on page load
export function initializeVendors() {
  // Swiper and other components auto-initialize
  // Custom animations can be added here as needed
  if (typeof window !== 'undefined') {
    console.log('✓ Vendors initialized with Vite');
  }
}

// Re-initialize when content changes (for React route changes)
export function reinitializeAnimations() {
  if (typeof window !== 'undefined') {
    console.log('✓ Animations re-initialized for new content');
  }
}
