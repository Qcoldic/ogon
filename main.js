// OGON — hero framework behaviour (Step 2)

// 1. Trigger the staggered fade-up once fonts are ready. Idempotent, and
//    guarded by several independent triggers so it can never get stuck hidden.
function reveal() { document.body.classList.add("loaded"); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal);
window.addEventListener("load", reveal);
setTimeout(reveal, 1200); // hard fallback if fonts/load hang

// 2. Hero ember video. Autoplay only on capable, motion-OK, larger screens;
//    otherwise the poster / warm placeholder stays (saves data + battery).
const heroVideo = document.querySelector(".hero-video");
if (heroVideo) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = matchMedia("(max-width: 860px)").matches;
  if (reduceMotion || smallScreen) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  } else {
    heroVideo.addEventListener("canplay", () => heroVideo.classList.add("ready"), { once: true });
    const p = heroVideo.play();
    if (p) p.catch(() => {}); // autoplay blocked -> placeholder stays, no error
  }
}

// 3. Manifesto: reveal on scroll + brass halo trailing the cursor.
const manifesto = document.querySelector(".manifesto");
if (manifesto) {
  // reveal once, when a third of the section is visible
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          manifesto.classList.add("inview");
          io.disconnect();
        }
      });
    }, { threshold: 0.33 });
    io.observe(manifesto);
  } else {
    manifesto.classList.add("inview");
  }

  // halo: desktop pointers only, and only if motion is OK
  const finePointer = matchMedia("(pointer: fine)").matches;
  const motionOK = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const halo = manifesto.querySelector(".halo");
  if (halo && finePointer && motionOK) {
    let tx = 0, ty = 0;   // target (cursor)
    let x = 0, y = 0;     // current (lagging)
    let raf = null;

    const tick = () => {
      // trailing motion: ease toward the cursor, never snap
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      halo.style.transform = `translate(${x}px, ${y}px)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    manifesto.addEventListener("pointermove", (e) => {
      const r = manifesto.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!manifesto.classList.contains("halo-on")) {
        x = tx; y = ty; // first entry: start at the cursor, no fly-in
        halo.style.transform = `translate(${x}px, ${y}px)`;
        manifesto.classList.add("halo-on");
      }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    manifesto.addEventListener("pointerleave", () => {
      manifesto.classList.remove("halo-on");
    });
  }
}

// 3b. The Fire: reveal the quote + start the slow drift when it scrolls in.
const fire = document.querySelector(".fire");
if (fire) {
  if ("IntersectionObserver" in window) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { fire.classList.add("inview"); io2.disconnect(); }
      });
    }, { threshold: 0.3 });
    io2.observe(fire);
  } else {
    fire.classList.add("inview");
  }
}

// 3c. The Room: reveal the staggered figures when the section scrolls in.
const room = document.querySelector(".room");
if (room) {
  if ("IntersectionObserver" in window) {
    const io3 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { room.classList.add("inview"); io3.disconnect(); }
      });
    }, { threshold: 0.2 });
    io3.observe(room);
  } else {
    room.classList.add("inview");
  }
}

// 4. Menu photos: if a dish image is not there (yet), show the quiet placeholder.
document.querySelectorAll(".dish-media img").forEach((img) => {
  const mark = () => img.closest(".dish-media").classList.add("missing");
  if (img.complete && img.naturalWidth === 0) mark();
  img.addEventListener("error", mark);
});

// 5. The Menu: pinned horizontal scrub on desktop (GSAP). If the CDN failed,
//    window.gsap is undefined and the section simply stays a vertical stack.
//
//    The pin is built ONLY after window.load, when images/video/fonts have
//    settled and the layout height is final. Building it earlier means
//    ScrollTrigger measures a page that is still growing — and if you scroll
//    during load, the pin releases at the wrong point and the menu overlaps
//    the section above it. Until load, the menu is a plain vertical stack that
//    scrolls safely.
function initMenuPin() {
  if (!(window.gsap && window.ScrollTrigger)) return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add("(min-width: 861px) and (prefers-reduced-motion: no-preference)", () => {
    const menu = document.querySelector(".menu");
    const track = menu.querySelector(".menu-track");
    menu.classList.add("is-horizontal");
    const dist = () => track.scrollWidth - window.innerWidth;

    gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: menu,
        pin: true,
        anticipatePin: 1,
        scrub: 1,
        end: () => "+=" + dist(),
        invalidateOnRefresh: true,
      },
    });

    // whisper of parallax on the photos (a few percent, per the spec)
    gsap.to(".dish-media img", {
      x: -26,
      ease: "none",
      scrollTrigger: {
        trigger: menu,
        scrub: 1,
        start: "top top",
        end: () => "+=" + dist(),
      },
    });

    return () => menu.classList.remove("is-horizontal");
  });

  // a late font swap can still change widths — one more recompute to be safe
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

if (document.readyState === "complete") {
  initMenuPin();
} else {
  window.addEventListener("load", initMenuPin);
}

// 6. Reservation form: validate, then swap to the success line (demo build —
//    a client build would POST to a backend here).
const form = document.querySelector(".reserve-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.classList.add("tried");
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    form.hidden = true;
    const ok = document.querySelector(".reserve-success");
    ok.hidden = false;
  });
}

// 6b. Note field grows with its content, so it never needs a scrollbar or the
//     drag handle (both render as a bright native strip on the dark theme).
const note = document.querySelector(".reserve-form textarea");
if (note) {
  const grow = () => {
    note.style.height = "auto";
    note.style.height = note.scrollHeight + "px";
  };
  note.addEventListener("input", grow);
}

// 7. Mobile nav popup (burger <-> full-screen popup with a cross).
const burger = document.querySelector(".burger");
const popup = document.querySelector(".nav-popup");
const closeBtn = document.querySelector(".nav-popup-close");

function openMenu() {
  popup.classList.add("open");
  popup.setAttribute("aria-hidden", "false");
  burger.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}
function closeMenu() {
  popup.classList.remove("open");
  popup.setAttribute("aria-hidden", "true");
  burger.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

burger.addEventListener("click", openMenu);
closeBtn.addEventListener("click", closeMenu);
popup.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && popup.classList.contains("open")) closeMenu();
});
