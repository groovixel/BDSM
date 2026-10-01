<?php
/**
 * Plugin Name: BDS Marvel
 * Description: Embeds the BDS Marvel React experience with the [bds_marvel] shortcode.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function bdsmarvel_enqueue_assets() {
    $build_dir = plugin_dir_path(__FILE__) . 'build/';
    $build_url = plugin_dir_url(__FILE__) . 'build/';
    $manifest_path = $build_dir . 'asset-manifest.json';

    if (!file_exists($manifest_path)) {
        return;
    }

    $manifest = json_decode(file_get_contents($manifest_path), true);
    if (!is_array($manifest)) {
        return;
    }

    $css = isset($manifest['files']['main.css']) ? $manifest['files']['main.css'] : null;
    $js = isset($manifest['files']['main.js']) ? $manifest['files']['main.js'] : null;

    if ($css) {
        wp_enqueue_style('bdsmarvel-app', $build_url . ltrim($css, '/'), array(), null);
    }
    if ($js) {
        wp_enqueue_script('bdsmarvel-app', $build_url . ltrim($js, '/'), array(), null, true);
    }
}

function bdsmarvel_shortcode() {
    bdsmarvel_enqueue_assets();
    return '<div id="bdsm-marvel-root" class="bdsm-marvel-embed"></div>';
}

add_shortcode('bds_marvel', 'bdsmarvel_shortcode');
