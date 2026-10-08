/* Hand-drawn UI icons; embedded SVG keeps every icon available offline. */
window.RiftIcons = (() => {
  const paths = {
    pack: '<path fill="#d7b786" d="M12 21 32 12 53 22 50 49 31 57 13 48Z"/><path fill="#f0dcb2" d="m12 21 19 9 22-8-21-10Z"/><path d="m31 30 0 27M22 17l20 10v11l-8 3V29"/><path fill="#fff8df" d="m45 7 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"/>',
    upgrades: '<path fill="#a7b995" d="m15 46 18-19-7-6 16-14 13 13-14 17-7-7-18 20Z"/><path d="m10 52 7-7M41 14l6 6"/><path fill="#ead3a1" d="m9 11 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"/>',
    equipment: '<path fill="#baa1bc" d="M17 17q15-12 30 0l4 34H13Z"/><path fill="#e7d5db" d="M17 29h30v22H17Z"/><path d="M23 13V9h18v4M22 30v9m20-9v9M18 22h28"/><path fill="#d8b87d" d="M29 28h7v14h-7Z"/>',
    power: '<path fill="#d1af82" d="m10 24 41-3 4 13-24 4-5 15-11-3 6-16-11-1Z"/><path d="m34 22 0 14m7-14 0 12M29 38h8l-2 8h-7"/><path fill="#f1d67e" d="m51 8-8 10h9l-6 11 13-15h-9Z"/>',
    pulse: '<path fill="#a0b7a8" d="m9 23 40-2 5 7-2 9-24 1-7 15-9-4 6-16-9-2Z"/><path fill="#d8b98d" d="m28 22 15-1v16H28Z"/><path d="M49 26h9v7h-6M14 29h10m8-1v5"/>',
    scatter: '<path fill="#c9b08e" d="m8 24 44-4 4 7-3 7-27 4-9 16-9-5 8-17Z"/><path fill="#abb7a0" d="m28 23 27-3v7l-26 4Z"/><path d="m31 34 25-4m-7-10 1 13M10 45l9 5"/><circle cx="58" cy="13" r="2" fill="#d4ad67"/><circle cx="59" cy="38" r="2" fill="#d4ad67"/>',
    rail: '<path fill="#91a8bc" d="m8 28 44-5 7 4-5 6-29 4-8 14-9-5 8-13Z"/><path d="m27 26 24-3m-22 12 22-3M32 17v8m-5-8h15"/><path fill="#d4dfe5" d="m42 24 0 10M10 29h10"/><path d="M52 15h8m-5 25h5"/>',
    frost: '<path fill="#9fbfc7" d="m8 28 41-4 7 6-5 8-26 1-6 13-9-3 7-17Z"/><path d="M32 18v25M21 25l22 13M22 39l21-13M28 21l4 4 4-4m-9 19 5-4 4 4"/><path fill="#eaf4eb" d="m48 25 8-6 4 11-8 8Z"/>',
    plasma: '<path fill="#af9cbc" d="M10 24h35l11 10-7 10H26l-6 10-10-4 8-15-8-2Z"/><ellipse fill="#e8c8dd" cx="46" cy="34" rx="10" ry="11"/><ellipse fill="#ad82b8" cx="49" cy="34" rx="5" ry="7"/><path d="M23 24v19m7-15h8m-8 8h8"/><circle cx="55" cy="13" r="4" fill="#d5b7de"/>',
    nova: '<path fill="#dab76c" d="m8 25 40-6 9 6-7 7-23 6-9 15-10-4 9-17Z"/><path fill="#f5e3af" d="m26 24 26-4v7l-26 5Z"/><path d="m28 35 27-7M18 39l6 3"/><path fill="#fff6d2" d="m46 4 2 5 6 2-6 2-2 6-2-6-6-2 6-2Z"/>',
    coil: '<path fill="#e5c3b5" d="M17 14h30v38H17Z"/><path fill="#fff5dd" d="M27 21h10v8h8v10h-8v8H27v-8h-8V29h8Z"/><path d="M23 9h18M23 55h18"/>',
    venom: '<path fill="#afbb96" d="M26 10h12v12l12 22q4 10-8 11H22q-12-1-8-11l12-22Z"/><path fill="#7ea16b" d="m20 36 25 0 5 10q2 6-8 6H22q-10 0-7-6Z"/><path fill="#d4c6a2" d="M23 7h18v9H23Z"/><circle cx="27" cy="42" r="2" fill="#dfe7bd"/><circle cx="36" cy="48" r="3" fill="#dfe7bd"/>',
    magnetCore: '<path fill="#a3b6bb" d="m32 8 21 8-3 20q-3 16-18 23-16-8-19-23l-2-20Z"/><path fill="#e4d6b3" d="m32 17 12 5-2 14q-3 8-10 13-8-5-10-13l-2-14Z"/><path d="M32 23v18m-7-11h14"/>',
    reactor: '<circle fill="#b39eb7" cx="32" cy="32" r="22"/><circle fill="#e5d5be" cx="32" cy="32" r="13"/><path fill="#bf9473" d="m34 18-11 16h8l-2 12 13-18h-9Z"/><path d="M32 4v7m0 42v7M4 32h7m42 0h7"/>',
    phoenix: '<path fill="#cd8e83" d="M32 52 13 34q-9-15 4-19 10-3 15 8 6-11 16-8 13 5 3 19Z"/><path fill="#e6b975" d="M32 47q-12-11-6-23l6 8 5-19q14 21-5 34Z"/>',
    hull: '<path fill="#a4b89a" d="m32 6 22 9-3 23q-5 15-19 21-15-7-19-21l-3-23Z"/><path fill="#ebdfb7" d="m21 22 11-5 12 5-2 14-10 11-10-11Z"/><path d="M32 17v30"/>',
    speed: '<path fill="#acbca3" d="m28 15 13 3-4 18 18 9v8H17v-9l8-9Z"/><path fill="#dcc29d" d="M18 44h36v9H17Z"/><path d="M4 25h14M7 33h9m15-8 6 2m-8 5 6 2"/>',
    rapid: '<path fill="#d9bc87" d="m35 7-18 27h13l-4 23 23-31H35Z"/><path d="M9 19h12M6 27h10m32 15h10m-13 8h10"/>',
    dash: '<path fill="#a9bcb0" d="M13 13h34v40H13Z"/><path fill="#e9d5a2" d="M24 6h12v7H24Z"/><path fill="#719888" d="m35 20-12 15h10l-5 13 14-19H31Z"/>',
    points: '<path fill="#d6ba83" d="m32 6 7 15 17 3-12 12 3 18-15-8-15 8 3-18L8 24l17-3Z"/><path d="m28 23 5-4 4 9-6 5 2 8"/>',
    skip: '<path fill="#a4b79c" d="m12 15 19 17-19 17Zm22 0 19 17-19 17Z"/><path d="M57 16v32"/>'
  };
  function make(id) {
    const node = document.createElement("span");
    node.className = "item-icon";
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="#46534a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + (paths[id] || paths.equipment) + '</svg>';
    return node;
  }
  return { make };
})();
