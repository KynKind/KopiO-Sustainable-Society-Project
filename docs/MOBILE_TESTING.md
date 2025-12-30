# Mobile Testing Guide

## Overview
This guide provides instructions for testing the Kopi-O Sustainable Society Project on mobile devices and various screen sizes.

## Testing Tools

### Browser DevTools
1. **Chrome DevTools**
   - Press F12 or Right-click > Inspect
   - Click the device toolbar icon (or Ctrl+Shift+M)
   - Select from preset devices or custom dimensions

2. **Firefox Responsive Design Mode**
   - Press Ctrl+Shift+M
   - Choose device or enter custom dimensions

### Recommended Test Devices
- iPhone SE (375x667) - Small mobile
- iPhone 12 Pro (390x844) - Standard mobile
- iPad (768x1024) - Tablet
- Samsung Galaxy S20 (360x800) - Android mobile

## Mobile Viewport Breakpoints

The application uses the following CSS breakpoints:

```css
/* Tablet and below */
@media (max-width: 768px) { }

/* Mobile and below */
@media (max-width: 480px) { }
```

## Testing Checklist

### Navigation & Layout

#### Header/Navigation
- [ ] Logo displays correctly
- [ ] Hamburger menu icon appears on mobile
- [ ] Hamburger menu opens/closes smoothly
- [ ] Menu items are easy to tap (min 44x44px)
- [ ] Navigation links work correctly
- [ ] Auth button (Login/Logout) is visible and functional
- [ ] User greeting displays appropriately

#### Footer
- [ ] Footer content is readable
- [ ] Social media links are tappable
- [ ] Footer adjusts to screen width
- [ ] Sponsor information displays correctly

### Authentication Pages

#### Login Page (login.html)
- [ ] Form inputs are properly sized
- [ ] Email input has correct keyboard type
- [ ] Password field has toggle visibility button
- [ ] Submit button is easy to tap
- [ ] Error messages are visible
- [ ] Success messages display correctly
- [ ] "Forgot Password" link works
- [ ] "Register" link works
- [ ] Form validation works on mobile

#### Register Page (register.html)
- [ ] All form fields are accessible
- [ ] Dropdown menus (Faculty) work on mobile
- [ ] Password strength indicator displays
- [ ] Confirm password field works
- [ ] Terms and conditions checkbox is tappable
- [ ] Submit button functions correctly
- [ ] Email validation for MMU emails works
- [ ] Success/error messages display

### Game Pages

#### Quiz Game (quiz_game.html)
- [ ] Question text is readable
- [ ] Answer options are easy to tap
- [ ] Timer is visible
- [ ] Score display is clear
- [ ] Progress bar displays correctly
- [ ] Next/Submit buttons are accessible
- [ ] Game over modal fits screen
- [ ] Results display clearly

**Test Actions:**
1. Start quiz game
2. Select answers by tapping
3. Submit answers
4. View results
5. Play again or return home

#### Memory Game (memory_game.html)
- [ ] Cards are appropriately sized for tapping
- [ ] Card grid adjusts to screen width
- [ ] Card flip animation works smoothly
- [ ] Timer and moves counter are visible
- [ ] Hint button is accessible
- [ ] Difficulty selector works
- [ ] Game over modal displays correctly
- [ ] Match info displays properly

**Test Actions:**
1. Start memory game
2. Tap cards to flip
3. Match pairs
4. Complete game
5. View final score

#### Puzzle Game (puzzle_game.html)
- [ ] Puzzle pieces are visible and distinguishable
- [ ] Pieces can be dragged/tapped on mobile
- [ ] Touch controls work smoothly
- [ ] Control buttons are accessible
- [ ] Level selection cards are tappable
- [ ] Timer and moves display clearly
- [ ] Progress indicators work
- [ ] Eco tips modal displays properly

**Test Actions:**
1. Select a puzzle theme
2. Move pieces using touch
3. Complete a sublevel
4. View eco tips
5. Progress through themes

#### Sorting Game (sorting_game.html)
- [ ] Items are easy to drag on mobile
- [ ] Bins are clearly visible
- [ ] Touch drag-and-drop works
- [ ] Timer is visible
- [ ] Score updates correctly
- [ ] Round completion modal displays
- [ ] Next round button works
- [ ] Results display clearly

**Test Actions:**
1. Start sorting game
2. Drag items to bins using touch
3. Check sorting
4. View results
5. Proceed to next round

### Profile & Leaderboard

#### Profile Page (my_profile.html)
- [ ] Profile information displays correctly
- [ ] Stats cards are readable
- [ ] Points breakdown is visible
- [ ] Recent games list scrolls properly
- [ ] Logout button is accessible
- [ ] Layout adjusts to screen width

#### Leaderboard Page (leaderboard.html)
- [ ] Top winners section displays
- [ ] Leaderboard list is scrollable
- [ ] User cards show all information
- [ ] Search bar works on mobile
- [ ] Faculty filter dropdown works
- [ ] Pagination buttons are tappable
- [ ] Rank indicators are visible

### Admin Panel (admin.html)

- [ ] Dashboard stats display correctly
- [ ] User table is horizontally scrollable
- [ ] Action buttons are accessible
- [ ] Search functionality works
- [ ] Filters work on mobile
- [ ] Modals display properly
- [ ] Forms are usable

### Static Pages

#### Home Page (index.html)
- [ ] Hero section displays correctly
- [ ] Event badge is visible
- [ ] Game cards are laid out properly
- [ ] Leaderboard preview loads
- [ ] CTA buttons are tappable
- [ ] Sponsor section displays

#### About Page (about.html)
- [ ] Content is readable
- [ ] Images scale properly
- [ ] Team section displays correctly
- [ ] Layout adjusts to mobile

#### Contact Page (contact.html)
- [ ] Contact form is usable
- [ ] Input fields are accessible
- [ ] Submit button works
- [ ] Contact information displays

## Touch Interaction Testing

### Tap Targets
All interactive elements should be at least 44x44px for easy tapping:
- [ ] Buttons
- [ ] Links
- [ ] Form inputs
- [ ] Checkboxes/Radio buttons
- [ ] Game pieces/cards
- [ ] Menu items

### Gestures
- [ ] Swipe left/right (if applicable)
- [ ] Scroll up/down smoothly
- [ ] Pinch to zoom disabled (where appropriate)
- [ ] Drag and drop works for games

### Keyboard
- [ ] Virtual keyboard doesn't obscure inputs
- [ ] Input type triggers correct keyboard:
  - Email: @ symbol accessible
  - Password: shows/hides keyboard
  - Number: numeric keyboard
- [ ] "Done"/"Go" button submits forms

## Performance on Mobile

### Page Load Times
- [ ] Pages load within 3 seconds on 3G
- [ ] Images are optimized
- [ ] CSS/JS files are minified
- [ ] No render-blocking resources

### Scrolling Performance
- [ ] Smooth scrolling throughout site
- [ ] No janky animations
- [ ] Fixed elements don't cause stuttering

### Battery Usage
- [ ] No excessive CPU usage
- [ ] Animations don't drain battery quickly
- [ ] Background processes are minimal

## Orientation Testing

### Portrait Mode (Default)
- [ ] All pages display correctly
- [ ] Navigation works properly
- [ ] Games are playable
- [ ] Forms are accessible

### Landscape Mode
- [ ] Layout adjusts appropriately
- [ ] No content is cut off
- [ ] Games remain playable
- [ ] Navigation remains accessible

## Network Conditions Testing

### Slow 3G
- [ ] Loading indicators display
- [ ] Error messages for timeouts
- [ ] Retry mechanisms work
- [ ] Essential content loads first

### Offline
- [ ] Appropriate error messages
- [ ] Cached content displays
- [ ] No broken functionality

### Poor Connection
- [ ] Requests don't hang indefinitely
- [ ] Timeout errors are handled gracefully
- [ ] User can retry actions

## Accessibility on Mobile

### Screen Readers
- [ ] VoiceOver (iOS) reads content correctly
- [ ] TalkBack (Android) navigates properly
- [ ] All interactive elements are announced
- [ ] Form labels are associated

### Contrast & Readability
- [ ] Text has sufficient contrast (4.5:1 minimum)
- [ ] Font sizes are readable (16px minimum)
- [ ] Touch targets are distinguishable
- [ ] Focus states are visible

### Font Scaling
- [ ] Layout doesn't break with large text
- [ ] Content remains readable at 200% zoom
- [ ] Buttons/inputs scale appropriately

## Browser Compatibility

### iOS Safari
- [ ] All features work correctly
- [ ] CSS renders properly
- [ ] Touch events work
- [ ] No webkit-specific issues

### Chrome Mobile
- [ ] All features work correctly
- [ ] CSS renders properly
- [ ] Touch events work
- [ ] PWA features work (if applicable)

### Firefox Mobile
- [ ] All features work correctly
- [ ] CSS renders properly
- [ ] Touch events work

### Samsung Internet
- [ ] All features work correctly
- [ ] CSS renders properly
- [ ] Touch events work

## Common Mobile Issues & Solutions

### Issue: Hamburger Menu Not Working
**Cause**: JavaScript not loaded or DOM not ready
**Solution**: Ensure script.js loads and DOMContentLoaded fires

### Issue: Touch Drag-and-Drop Not Working
**Cause**: Mouse events used instead of touch events
**Solution**: Implement touch event handlers (touchstart, touchmove, touchend)

### Issue: Form Inputs Too Small
**Cause**: No mobile-specific styling
**Solution**: Add media queries for larger input heights (min 44px)

### Issue: Viewport Not Scaling
**Cause**: Missing viewport meta tag
**Solution**: Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

### Issue: Text Too Small
**Cause**: Fixed pixel sizes
**Solution**: Use relative units (rem, em) and set minimum font size

### Issue: Horizontal Scrolling
**Cause**: Fixed widths or overflowing content
**Solution**: Use `max-width: 100%` and `overflow-x: hidden`

## Testing Workflow

### Step 1: Desktop Testing First
1. Test all functionality on desktop
2. Ensure all features work correctly
3. Fix any bugs before mobile testing

### Step 2: Responsive Design Testing
1. Use browser DevTools
2. Test at each breakpoint (768px, 480px)
3. Check layout adjustments
4. Verify all content is accessible

### Step 3: Real Device Testing
1. Test on actual mobile devices
2. Verify touch interactions
3. Check performance
4. Test different orientations

### Step 4: Cross-Browser Testing
1. Test on iOS Safari
2. Test on Chrome Mobile
3. Test on Firefox Mobile
4. Test on Samsung Internet (if available)

### Step 5: Accessibility Testing
1. Test with screen readers
2. Verify keyboard navigation
3. Check color contrast
4. Test with larger text sizes

## Testing Tools & Resources

### Browser DevTools
- Chrome DevTools Device Mode
- Firefox Responsive Design Mode
- Safari Web Inspector

### Online Testing Services
- BrowserStack (cross-browser testing)
- LambdaTest (real device testing)
- Sauce Labs (automated testing)

### Performance Testing
- Google PageSpeed Insights
- GTmetrix
- WebPageTest

### Accessibility Testing
- aXe DevTools Extension
- WAVE Web Accessibility Evaluation Tool
- Lighthouse Audit

## Test Report Template

```markdown
## Mobile Test Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Device**: [Device Name/Browser]
**Screen Size**: [Resolution]
**OS**: [Operating System]

### Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Navigation | ✅ Pass | - |
| Login | ✅ Pass | - |
| Quiz Game | ⚠️ Partial | Issue with timer visibility |
| Profile | ✅ Pass | - |

### Issues Found

1. **Timer not visible on quiz game**
   - Severity: Medium
   - Steps to reproduce: ...
   - Expected behavior: ...
   - Actual behavior: ...

### Recommendations

1. Increase tap target size for quiz options
2. Improve loading indicators
3. Add haptic feedback for game interactions
```

## Conclusion

Regular mobile testing ensures a great user experience across all devices. Follow this guide to catch issues early and maintain high quality standards for mobile users.
