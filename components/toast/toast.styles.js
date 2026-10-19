export const TOAST_STYLES = `
:host {
    --toast-bg: rgba(15, 17, 20, .92);
    --toast-border: rgba(255, 255, 255, .14);

    position: fixed;
    z-index: 9999;
    top: 24px;
    right: 24px;
    display: block;
    width: min(510px, calc(100vw - 32px));
    box-sizing: border-box;
    pointer-events: none;
    color: #fff;
    font-family: 'Amatic SC', cursive;
}

.cause-toast {
    position: relative;
    box-sizing: border-box;
    padding: 22px;
    overflow: hidden;
    color: #fff;
    background:
        radial-gradient(circle at 92% 5%, rgba(52, 196, 253, 0.23), transparent 28%),
        radial-gradient(circle at 0% 100%, rgba(255, 75, 111, .18), transparent 35%),
        var(--toast-bg);
    border: 1px solid var(--toast-border);
    border-radius: 18px;
    box-shadow:
        0 22px 60px rgba(0, 0, 0, .40),
        0 0 0 1px rgba(255, 255, 255, .03) inset;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    pointer-events: auto;

    opacity: 0;
    transform: translate3d(calc(100% + 40px), 0, 0) scale(.96);
    animation: causeToastIn .85s cubic-bezier(.16, 1, .3, 1) .35s forwards;
}

.cause-toast::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(115deg,
            transparent 15%,
            rgba(255, 255, 255, .08) 40%,
            transparent 62%);
    transform: translateX(-120%);
    animation: causeToastShine 4.5s ease-in-out 1.2s infinite;
}

.cause-toast__glow {
    position: absolute;
    width: 170px;
    height: 170px;
    right: -95px;
    top: -105px;
    border-radius: 50%;
    background: rgba(255, 190, 52, .22);
    filter: blur(25px);
    pointer-events: none;
    animation: causeToastGlow 3.5s ease-in-out infinite alternate;
}

.cause-toast__close {
    position: absolute;
    z-index: 2;
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 50%;
    color: rgba(255, 255, 255, .76);
    background: rgba(255, 255, 255, .07);
    cursor: pointer;
    transition: transform .2s ease, background .2s ease, color .2s ease;
}

.cause-toast__close:hover {
    color: #fff;
    background: rgba(255, 255, 255, .16);
    transform: rotate(90deg);
}

.cause-toast__header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 13px;
    padding-right: 30px;
}

.cause-toast__badge {
    flex: 0 0 45px;
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    color: #171717;
    font-size: 16px;
    border-radius: 13px;
    background: linear-gradient(135deg, #8db6fa, #ed626f);
    box-shadow: 0 8px 25px rgba(255, 179, 57, .22);
    animation: causeToastPulse 2.4s ease-in-out infinite;
}

.cause-toast h2 {
    margin: 0;
    font-family: "Amatic SC", cursive;
    font-size: 19px;
    line-height: 1;
    letter-spacing: 1.1px;
    font-weight: 700;
}

.cause-toast__eyebrow {
    display: block;
    margin-top: 5px;
    color: rgba(255, 255, 255, .58);
    font-family: "Amatic SC", cursive;
    font-size: .86em;
    letter-spacing: .8px;
    text-transform: uppercase;
}

.cause-toast__text {
    position: relative;
    margin: 16px 0;
    color: rgba(255, 255, 255, .78);
    font-family: "Amatic SC", cursive;
    font-size: .92em;
    line-height: 1.5;
}

.cause-toast__text a {
    color: #ffd15c;
    font-weight: 700;
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 209, 92, .45);
    transition: color .2s ease, border-color .2s ease;
}

.cause-toast__text a:hover {
    color: #fff;
    border-color: #fff;
}

.cause-toast__warn {
    display: none;
    margin: 0 0 14px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 120, 120, .5);
    border-radius: 10px;
    background: rgba(255, 60, 60, .14);
    color: #ffd0d0;
    font-family: "Amatic SC", cursive;
    font-size: .9em;
    line-height: 1.25;
}

.cause-toast__pdf {
    position: relative;
    display: flex;
    align-items: center;
    gap: 13px;
    min-height: 62px;
    box-sizing: border-box;
    padding: 8px 13px 8px 8px;
    color: #fff;
    text-decoration: none;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 12px;
    background: linear-gradient(100deg,
            rgba(255, 255, 255, .095),
            rgba(255, 255, 255, .045));
    box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
    transition: transform .22s ease, border-color .22s ease, background .22s ease;
}

.cause-toast__pdf:hover {
    transform: translateX(-3px);
    border-color: rgba(255, 209, 92, .38);
    background: linear-gradient(100deg,
            rgba(255, 209, 92, .12),
            rgba(255, 255, 255, .06));
}

.cause-toast__pdf-icon {
    flex: 0 0 47px;
    width: 47px;
    height: 47px;
    display: grid;
    place-items: center;
    color: #ff6464;
    font-size: 1.12em;
    border: 1px solid rgba(255, 255, 255, .13);
    border-radius: 9px;
    background: rgba(255, 255, 255, .075);
}

.cause-toast__pdf-info {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: "Amatic SC", cursive;
}

.cause-toast__pdf-info strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: .88em;
    font-weight: 700;
}

.cause-toast__pdf-info small {
    color: rgba(255, 255, 255, .48);
    font-size: .82em;
    letter-spacing: .4px;
}

.cause-toast__arrow {
    color: rgba(255, 255, 255, .45);
    font-size: 12px;
    transition: transform .2s ease, color .2s ease;
}

.cause-toast__pdf:hover .cause-toast__arrow {
    color: #ffd15c;
    transform: translateX(3px);
}

.cause-toast.is-closing {
    animation: causeToastOut .42s cubic-bezier(.7, 0, .84, 0) forwards;
}

.cause-toast.is-warning {
    opacity: 1;
    transform: none;
    border-color: rgba(255, 90, 90, .6);
    background:
        radial-gradient(circle at 92% 5%, rgba(255, 75, 75, .30), transparent 30%),
        radial-gradient(circle at 0% 100%, rgba(255, 75, 111, .28), transparent 38%),
        rgba(40, 12, 14, .94);
    animation: causeToastShake .55s ease-in-out 0s 1;
}

.cause-toast.is-warning .cause-toast__badge {
    background: linear-gradient(135deg, #ff8a8a, #d21f2f);
    color: #fff;
    animation: none;
}

.cause-toast.is-warning .cause-toast__warn { display: block; }

.cause-toast.is-warning .cause-toast__close {
    background: rgba(255, 90, 90, .25);
    border-color: rgba(255, 120, 120, .6);
}

@keyframes causeToastIn {
    from { opacity: 0; transform: translate3d(calc(100% + 40px), 0, 0) scale(.96); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes causeToastOut {
    from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    to   { opacity: 0; transform: translate3d(calc(100% + 40px), 0, 0) scale(.96); }
}

@keyframes causeToastShine {
    0%, 45%  { transform: translateX(-120%); }
    75%, 100%{ transform: translateX(120%); }
}

@keyframes causeToastGlow {
    from { transform: scale(.9);  opacity: .65; }
    to   { transform: scale(1.18); opacity: 1; }
}

@keyframes causeToastPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.045); }
}

@keyframes causeToastShake {
    0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
    15%      { transform: translate3d(-6px, 0, 0) rotate(-1deg); }
    30%      { transform: translate3d(6px, 0, 0) rotate(1deg); }
    45%      { transform: translate3d(-5px, 0, 0) rotate(-.6deg); }
    60%      { transform: translate3d(5px, 0, 0) rotate(.6deg); }
    75%      { transform: translate3d(-3px, 0, 0) rotate(0); }
}

@media (max-width: 600px) {
    :host {
        top: 12px;
        right: 12px;
        width: calc(100vw - 24px);
    }
    .cause-toast { padding: 18px; border-radius: 16px; }
    .cause-toast h2 { font-size: 19px; }
    .cause-toast__text { font-size: .92em; }
}

@media (prefers-reduced-motion: reduce) {
    .cause-toast,
    .cause-toast::before,
    .cause-toast__glow,
    .cause-toast__badge {
        animation: none;
    }
    .cause-toast {
        opacity: 1;
        transform: none;
    }
    .cause-toast.is-closing {
        animation: causeToastOut .2s ease forwards;
    }
    .cause-toast.is-warning { animation: none; }
}

.cause-toast svg { display: block; width: 1em; height: 1em; }
.cause-toast__badge svg { width: 20px; height: 20px; }
.cause-toast__close svg { width: 13px; height: 13px; }
.cause-toast__pdf-icon svg { width: 24px; height: 24px; }
.cause-toast__arrow svg { width: 14px; height: 14px; transition: transform .2s ease; }
.cause-toast__pdf:hover .cause-toast__arrow svg { transform: translateX(3px); }

a:focus-visible, button:focus-visible { outline: 2px solid #9abcf4; outline-offset: 3px; }
`;
