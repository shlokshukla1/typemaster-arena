package com.typemaster.arena.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the single-page frontend. Navigation inside the app uses hash routes
 * (#/home, #/games, #/game/racing ...) so only "/" needs a server mapping.
 */
@Controller
public class PageController {

    @GetMapping({"/", "/index.html"})
    public String index() {
        return "index";
    }
}
