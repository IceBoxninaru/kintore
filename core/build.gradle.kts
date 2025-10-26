plugins { java }
java { toolchain { languageVersion.set(JavaLanguageVersion.of(17)) } }
dependencies { testImplementation("org.junit.jupiter:junit-jupiter:5.11.3") }
tasks.test { useJUnitPlatform() }
