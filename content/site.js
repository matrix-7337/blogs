const BLOG_SITE = {
  name: "3L3V3N",
  domain: "3l3v3n.log",
  tagline: "CTF writeups, exploit notes & other things I probably shouldn't have touched.",
  shortTagline: "DFIR | CTF player. Breaks things, writes it down.",
  description: "A brutally honest log of CTF challenges, security research, and random experiments.",
  author: {
    name: "3l3v3n",
    handle: "@matrix-7337",
    role: "",
    location: "Mushroom",
    bio: "I'm a DFIR & Threat Hunting student also a CTF Player.",
    photo: "assets/avatar.svg",
    since: "2026"
  },
  social: {
    github: "https://github.com/matrix-7337",
    twitter: "https://x.com/",
    website: "https://matrix-7337.github.io"
  },
  links: [
    { label: "GITHUB", url: "https://github.com/matrix-7337" },
    { label: "TWITTER / X", url: "https://x.com/" },
    { label: "CTFTIME", url: "https://ctftime.org/users/" },
    { label: "TRYHACKME", url: "https://tryhackme.com/p/" }
  ],
  about: {
    intro: "Welcome to the dumpster. This site is where  I write about all CTF challenges, Experiments, My Thoughts and concepts I had to re-learn three times before they stuck.",
    sections: [
      {
        title: "WHAT GOES HERE",
        body: `Mostly **CTF writeups** with the full thought process: the wrong turns included. If a challenge made me stare at a hexdump for two hours, it probably ended up here.\n\nYou will also find:\n\n- My NOTES \n- Homelabs and Other Labs\n- My thoughts and Cool stuffs\n- Small scripts and tooling I build to make the above less painful`
      },
      {
        title: "HOW I WRITE",
        body: `A writeup here is a reproduction guide, not a flex. I try to include the *why* behind every step, the commands I actually ran, and the dead ends that cost me time.\n\n> If you can read it, you can redo it. That's the bar.`
      },
      {
        title: "CONTACT",
        body: `Found a mistake, a better solution, or a challenge you think I'd enjoy? Reach out through any of the links below. Bug reports on the writeups are especially welcome - half of these were written at 3am.`
      }
    ],
    facts: [
      { label: "SOLVING SINCE", value: "2026" },
      { label: "FAVOURITE CATEGORY", value: "FORENSICS. / CRYPT" },
      { label: "CURRENT OBSESSION", value: "JAIL ESCAPES" },
      { label: "COFFEES PER WRITEUP", value: "4+" }
    ],
    stack: ["SLUETHKIT", "PYTHON", "LINUX", "Wireshark", "CyberChef", "vim"]
  }
};
