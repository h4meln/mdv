export const SOCIALBAR_STYLES = `
:host{
    display:block;
    position:relative;
    pointer-events:auto;
    --size: 1.72rem;
    --gap:1.25rem;
    --top:1.5rem;
    --offset-x:0px;
    --offset-y:0px;
    --hover-y:-3px;
    --glitch:2px;
    --speed:420ms;
    --red:#f44336;
    --blue:#2196f3;
}

.sb-defs{
    position:absolute;
    top:0;
    left:0;
    width:0;
    height:0;
    overflow:hidden;
    pointer-events:none;
}

.sb-root{
    position:relative;
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    gap:var(--gap);
    padding-top:var(--top);
    transform:translate(var(--offset-x),var(--offset-y));
    pointer-events:auto;
}

.sb-root--v{flex-direction:column;align-items:center}
.sb-root--left{justify-content:flex-start}
.sb-root--center{justify-content:center}
.sb-root--right{justify-content:flex-end}

/* ---------- item ---------- */
.sb-item{
    position:relative;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    color:inherit;
    text-decoration:none;
    cursor:pointer;
    pointer-events:auto !important;   /* vince su qualunque eredità */
    line-height:0;
    outline:0;
    -webkit-tap-highlight-color:transparent;
    transition:transform .25s cubic-bezier(.34,1.56,.64,1);
    isolation:isolate;
}

/* overlay trasparente SOPRA l'icona: cattura hover + click in modo affidabile
   anche se i figli sono pointer-events:none o c'è qualche z-index in mezzo */
.sb-item::before{
    content:"";
    position:absolute;
    inset:0;
    z-index:50;
    cursor:pointer;
    pointer-events:auto !important;
}

.sb-item--static{cursor:default}
.sb-item--static::before{cursor:default}

.sb-item:hover,
.sb-item:focus-visible,
.sb-item--active{
    transform:translateY(var(--hover-y));
}

.sb-item:focus-visible{
    outline:2px solid var(--blue);
    outline-offset:6px;
    border-radius:12px;
}

/* ---------- icona ---------- */
.sb-icon{
    position:relative;
    display:inline-block;
    width:var(--size);
    height:var(--size);
    isolation:isolate;
    pointer-events:none;              /* l'overlay ::before gestisce tutto */
}

.sb-layer{display:block;width:100%;height:100%;fill:currentColor;pointer-events:none}
.sb-layer--main{position:relative;z-index:2;color:#fff}

/* longhand: l'override di animation-play-state in :hover è affidabile
   anche quando la shorthand usa var() */
.sb-layer--r,
.sb-layer--b{
    position:absolute;
    inset:0;
    z-index:1;
    pointer-events:none;
    will-change:transform;
    animation-duration:var(--speed);
    animation-iteration-count:infinite;
    animation-timing-function:linear;
    animation-play-state:running;
}
.sb-layer--r{color:var(--red);animation-name:glitch-r}
.sb-layer--b{color:var(--blue);animation-name:glitch-b}

/* pausa del glitch "dove si trova" */
.sb-item:hover .sb-layer--r,
.sb-item:hover .sb-layer--b,
.sb-item:focus-visible .sb-layer--r,
.sb-item:focus-visible .sb-layer--b,
.sb-item--active .sb-layer--r,
.sb-item--active .sb-layer--b{
    animation-play-state:paused;
}

@keyframes glitch-r{
    0%{transform:translate(var(--glitch),var(--glitch))}
    25%{transform:translate(calc(var(--glitch)*-1),calc(var(--glitch)*-1.5))}
    50%{transform:translate(var(--glitch),calc(var(--glitch)*-1))}
    75%{transform:translate(calc(var(--glitch)*-1.6),calc(var(--glitch)*-1))}
    100%{transform:translate(calc(var(--glitch)*-1),0)}
}

@keyframes glitch-b{
    0%{transform:translate(calc(var(--glitch)*-1),calc(var(--glitch)*-1.5))}
    25%{transform:translate(var(--glitch),var(--glitch))}
    50%{transform:translate(calc(var(--glitch)*-1.6),var(--glitch))}
    75%{transform:translate(calc(var(--glitch)*-1),calc(var(--glitch)*-1))}
    100%{transform:translate(var(--glitch),calc(var(--glitch)*-1))}
}

@media(prefers-reduced-motion:reduce){
    .sb-layer--r,.sb-layer--b{animation:none!important}
    .sb-item:hover,
    .sb-item:focus-visible,
    .sb-item--active{transform:none}
}
`;