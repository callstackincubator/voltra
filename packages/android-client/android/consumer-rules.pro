# R8 rules shipped to apps that consume this library. One section per concern, each saying which
# code needs it and why.

# --- WorkManager (issue #360) ---
# WorkManager creates its Room database (WorkDatabase_Impl) and its input mergers reflectively
# through their no-arg constructors. WorkManager 2.9.1 and Room 2.5.0 ship class-only `-keep`
# rules, which R8 with strict full-mode keep-rule semantics no longer treats as keeping the
# constructor. Without these, the app crashes on launch in WorkManager's startup initializer and
# one-time work fails to create its input merger. Delete once the WorkManager floor is >= 2.11.0
# (which brings Room >= 2.7.0); both then ship these rules themselves.
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
