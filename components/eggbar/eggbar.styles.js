export const NAVBAR_STYLES = `
:host {
  display: block;
  position: fixed;
  bottom: 2.5vh;
  left: 50%;
  transform: translateX(-50%);
  width: 520px;
  aspect-ratio: 520 / 150;
  font-size: 1.72rem;
  --nav-transition: 0.65s;
  --nav-hover: 0.45s;           /* scale hover: lento e delicato */
  z-index: 1000;
}
.navbar-svg { display: block; width: 100%; height: auto;}

.navbar-items {
  position: absolute; left: 3.846%; right: 3.846%; bottom: 0;
  height: 46.667%; display: flex; list-style: none; margin: 0; padding: 0;
}
.navbar-items li { flex: 1; position: relative; }
.navbar-items li a {
  position: relative; display: block; width: 100%; height: 100%;
  text-decoration: none; color: var(--navbar-clr);
  outline: none;                                /* rimuove il riquadro di focus */
  -webkit-tap-highlight-color: transparent;     /* niente flash su mobile */
  -webkit-user-select: none; user-select: none;
}
.navbar-items li a:focus,
.navbar-items li a:focus-visible { outline: none; }

.navbar-icon {
  position: absolute; top: 50%; left: 50%;
  width: 1em; height: 1em;
  background-color: var(--navbar-clr);
  -webkit-mask-image: var(--icon);   mask-image: var(--icon);
  -webkit-mask-size: contain;        mask-size: contain;
  -webkit-mask-repeat: no-repeat;    mask-repeat: no-repeat;
  -webkit-mask-position: center;     mask-position: center;
  transform: translate(-50%, -50%) scale(1);
  transform-origin: center;
  transition:
    top var(--nav-transition),
    background-color var(--nav-transition),
    transform var(--nav-hover) cubic-bezier(0.22, 1, 0.36, 1);
}
.navbar-items li.active .navbar-icon {
  top: calc(50% - 1.533em);
  background-color: var(--active-clr);
}

/* hover delicato — solo su dispositivi con vero puntatore */
@media (hover: hover) and (pointer: fine) {
  .navbar-items li a:hover .navbar-icon {
    transform: translate(-50%, -50%) scale(1.18);
  }
}

/* stesso feedback quando si naviga con la tastiera */
.navbar-items li a:focus-visible .navbar-icon {
  transform: translate(-50%, -50%) scale(1.18);
}

.navbar-label {
  position: absolute; left: 50%;
  transform: translateX(-50%);
  font-size: 0.65em;
  font-weight: 700;
  letter-spacing: 0.12em; white-space: nowrap;
  opacity: 0; color: var(--navbar-clr);
  transition: opacity var(--nav-transition), bottom var(--nav-transition);
}
.navbar-items li.active .navbar-label { opacity: 1; bottom: 8%;}

#navbar-bg { fill: var(--navbar-bg); transition: rx 0.3s;}
#navbar-indicator { fill: var(--indicator-bg);}

#navbar-indicator-group,
#navbar-mask-group {
  will-change: transform;
}
:host([data-ready]) #navbar-indicator-group,
:host([data-ready]) #navbar-mask-group {
  transition: transform var(--nav-transition) cubic-bezier(0.4, 0, 0.2, 1);
}
@media (max-width: 600px) {
  :host {
    position: fixed; left: 0; right: 0; bottom: 0;
    transform: none; width: 100%;
    font-size: 6vw;
  }
  #navbar-bg { rx: 0; }
}
`;