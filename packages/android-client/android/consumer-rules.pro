# WorkManager (pulled in transitively through this package) creates its Room
# database and its input mergers reflectively through their no-arg constructors.
# With strict R8 keep-rule semantics, `-keep class` alone no longer retains those
# constructors, so they get stripped and WorkManager's startup initializer
# crashes the app on launch.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
