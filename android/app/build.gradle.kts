import java.util.Properties

plugins {
    id("com.android.application")
}

// Il gioco vive nella cartella principale (è anche il sito): lo copiamo negli asset a ogni build.
val syncWeb by tasks.registering(Sync::class) {
    from(rootDir.parentFile) {
        include("index.html", "style.css", "app.js", "game.js", "words.js", "icon.svg", "icon-192.png", "vendor/**")
    }
    into(layout.projectDirectory.dir("src/main/assets/www"))
}
tasks.named("preBuild") { dependsOn(syncWeb) }

val keyProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.wolverr.impostore"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.wolverr.impostore"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        create("release") {
            storeFile = rootProject.file(keyProps.getProperty("storeFile", "keystore/release.jks"))
            storePassword = keyProps.getProperty("storePassword")
            keyAlias = keyProps.getProperty("keyAlias")
            keyPassword = keyProps.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
