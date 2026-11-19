import type { Page } from "../../src/index/page.ts";

export const PAGES: Page[] = [
  {
    url: "/",
    title: "Shinsters",
    description: "A modular web platform, built to grow.",
    lang: "en",
    headings: ["Shinsters"],
    text: "Shinsters A modular web platform, built to grow.",
    visibility: "public",
  },
  {
    url: "/profile/",
    title: "Profile",
    description: "Professional profile and resume.",
    lang: "en",
    headings: ["Projects", "webserv", "Education", "École 42 Lyon"],
    text:
      "Open to a 6-month internship. Projects ft_transcendence lending platform. " +
      "webserv HTTP server in C++ with CGI. " +
      "Education École 42 Lyon digital technology architect.",
    visibility: "public",
  },
  {
    url: "/notes/docker/",
    title: "Docker notes",
    description: "Notes on containers.",
    lang: "en",
    headings: ["Docker notes", "Networks"],
    text: "Docker compose networks and volumes. I also tested webserv inside a container.",
    visibility: "public",
  },
  {
    url: "/mentions-legales/",
    title: "Mentions légales",
    description: "Mentions légales et données personnelles.",
    lang: "fr",
    headings: ["Éditeur", "Hébergeur", "Données personnelles"],
    text: "Éditeur du site. Hébergeur. Aucune donnée personnelle n'est collectée.",
    visibility: "public",
  },
  {
    url: "/members/roadmap/",
    title: "Members roadmap",
    description: "Private plans.",
    lang: "en",
    headings: ["Roadmap"],
    text: "Secret roadmap: docker swarm migration.",
    visibility: "private",
  },
];
