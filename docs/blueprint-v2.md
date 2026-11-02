LEANWARD

Product Vision, Requirements & Development Blueprint

Version 2.0 | November 2026

Brand concept: Move toward better.

Product category: Nutrition tracking, body composition management, and personalized nutrition intelligence.

⸻

1. Executive Summary

Leanward is a comprehensive nutrition and body composition platform designed to help people understand their nutrition, achieve their physical goals, and measure meaningful progress.

The product combines the nutritional depth of Cronometer, the adaptive calorie recommendations of MacroFactor, and a dedicated body composition management system.

However, Leanward should not simply replicate existing calorie-tracking applications.

Its defining feature is the ability to organize nutrition around the user’s individual goals and current strategy.

Users should be able to:

* Track calories, macronutrients, and micronutrients.
* Set personalized nutritional targets.
* Choose goals such as losing fat, building muscle, body recomposition, or maintaining their physique.
* Follow different nutritional phases as their goals evolve.
* Monitor weight, body fat estimates, measurements, and strength progression.
* Understand whether their current nutritional strategy is working.
* Receive intelligent, evidence-informed recommendations based on actual progress.

Core philosophy: Don’t just track what you eat. Understand what your nutrition is doing for your body.

Leanward should be sophisticated enough for serious fitness enthusiasts but intuitive enough for someone who simply wants to eat better.

2. Product Positioning

Leanward is not exclusively a weight-loss application.

It is designed for people with different nutritional and physical goals.

Primary audience

* Strength-training enthusiasts.
* People interested in body composition.
* People pursuing fat loss.
* People pursuing muscle growth.
* People interested in body recomposition.
* People who want comprehensive nutritional information.
* Health-conscious individuals who appreciate measurable progress.

Secondary audience

* Everyday calorie and macro trackers.
* People improving their dietary habits.
* Individuals interested in micronutrient intake.
* People who want better insight into their nutritional patterns.

The product should appeal to both beginners and experienced users without overwhelming either group.

3. Core Product Architecture

Leanward should be built around five primary pillars.

1. TRACK

Comprehensive food and nutrition tracking.

2. TRANSFORM

Goal selection and nutritional phase management.

3. MEASURE

Weight, body composition, measurements, and performance tracking.

4. UNDERSTAND

Nutrition reports, trends, patterns, and personalized insights.

5. ADAPT

Intelligent recommendations that evolve as the user’s goals and body change.

These five pillars should work together rather than functioning as disconnected features.

4. User Goals and Nutritional Phases

This distinction is fundamental to Leanward’s architecture.

Goals represent what someone wants to accomplish. Phases represent the nutritional strategy currently being followed.

The app must never assume that every user wants to lose weight.

A. Goal selection

During onboarding, users should select their primary objective.

Available goals:

1. Lose body fat.
2. Build muscle.
3. Body recomposition.
4. Maintain current physique.
5. Improve overall nutrition without a specific weight goal.

Users should be able to change their goals whenever their priorities change.

B. Nutritional phases

Leanward should support several nutritional strategies.

Cutting

Reduce body fat while preserving muscle.

Features:

* Estimated maintenance calories.
* Appropriate calorie deficit.
* Personalized protein target.
* Fat and carbohydrate targets.
* Weight trend monitoring.
* Muscle-preservation considerations.
* Progress assessments.

Body Recomposition

Build muscle while reducing body fat.

Features:

* Maintenance or modest-deficit calorie strategy, depending on the individual.
* Adequate protein targets.
* Weight trend monitoring.
* Waist measurements.
* Strength progression.
* Body composition estimates.
* Progress assessments that don’t rely exclusively on weight loss.

A user who maintains their weight while reducing waist circumference and increasing strength should be able to recognize that as meaningful potential progress.

Lean Bulk

Build muscle while limiting unnecessary fat gain.

Features:

* Estimated maintenance calories.
* Controlled calorie surplus.
* Protein targets.
* Weight gain rate monitoring.
* Waist measurements.
* Strength progression.
* Adjustments based on actual progress.

Maintenance

Maintain body weight and body composition.

Features:

* Estimated maintenance intake.
* Flexible calorie targets.
* Macro tracking.
* Weight stability monitoring.
* Long-term nutritional consistency.

Reverse Diet

An optional advanced strategy for transitioning out of a calorie deficit.

Features:

* Gradual changes in calorie intake when desired.
* Weight trend monitoring.
* Maintenance estimation.
* Educational guidance explaining what reverse dieting can and cannot accomplish.

Nutrition Optimization

An optional mode for people who don’t want a body composition goal.

Features:

* Calorie and macro tracking.
* Micronutrient monitoring.
* Dietary pattern analysis.
* Nutritional recommendations.
* No requirement to pursue weight loss or weight gain.

C. Phase transitions

Users should be able to transition between phases without losing historical information.

Examples:

* Cutting → Maintenance
* Cutting → Recomp
* Recomp → Lean Bulk
* Lean Bulk → Maintenance
* Lean Bulk → Cutting

Leanward should preserve historical targets, dates, measurements, and progress.

When recommending a phase change, the app should explain why and allow the user to make the final decision.

5. Onboarding and Personalization

Onboarding should collect the information necessary to establish meaningful nutritional targets.

Personal information

* Age.
* Sex, where relevant to the calculation.
* Height.
* Current weight.
* Optional goal weight.
* Activity level.
* Training frequency.

Body composition information

* Estimated body fat percentage, optional.
* Waist circumference, optional.
* Other body measurements, optional.
* Available body composition measurements.

Goal information

* Primary objective.
* Desired rate of progress, where applicable.
* Current nutritional phase.
* Dietary preferences.
* Relevant food restrictions.

Target calculation

Leanward should establish initial calorie and macro targets using an appropriate evidence-informed methodology.

Calculations should consider:

* Estimated basal metabolic rate.
* Estimated total daily energy expenditure.
* Activity level.
* Training frequency.
* Current goal.
* Nutritional phase.
* Desired rate of change.

Users should be able to customize their targets.

Initial calculations should be treated as estimates rather than precise measurements.

6. Comprehensive Nutrition Tracking

Food tracking is foundational. The experience must be fast, accurate, and intuitive.

Daily food diary

Support:

* Breakfast.
* Lunch.
* Dinner.
* Snacks.
* Beverages.
* Supplements.

Nutritional information

Essential:

* Calories.
* Protein.
* Carbohydrates.
* Fat.
* Fiber.

Additional:

* Saturated fat.
* Unsaturated fat.
* Trans fat, when available.
* Sugar.
* Added sugar.
* Sodium.
* Potassium.
* Cholesterol.

Micronutrients:

* Calcium.
* Magnesium.
* Iron.
* Zinc.
* Vitamin A.
* B vitamins.
* Vitamin C.
* Vitamin D.
* Vitamin E.
* Vitamin K.
* Other available vitamins and minerals.

Leanward should provide nutritional depth comparable to Cronometer.

Food logging methods

Support multiple methods:

1. Food database search.
2. Barcode scanning.
3. Manual food entry.
4. Custom foods.
5. Recipe creation.
6. Saved meals.
7. Quick calorie and macro entry.
8. AI-assisted photo logging.
9. Voice-assisted logging.

AI-assisted logging should be introduced carefully. Estimates must be clearly identified as estimates and remain editable.

Serving sizes

Support:

* Grams.
* Ounces.
* Milliliters.
* Cups.
* Tablespoons.
* Teaspoons.
* Individual items.
* Standard servings.

Provide raw and cooked food distinctions wherever relevant.

Saved meals and recipes

Users should be able to:

* Save frequently eaten meals.
* Create recipes using multiple ingredients.
* Adjust recipe serving sizes.
* Copy previous meals.
* Duplicate entire days.
* Create meal templates.
* Quickly log recurring foods.

Logging should require as few interactions as reasonably possible.

7. Food Database

Food database quality should be a major competitive advantage.

Requirements:

* Comprehensive generic food database.
* Branded packaged food information.
* Barcode lookup.
* Accurate serving sizes.
* Micronutrient information where available.
* Duplicate detection.
* Verified and user-submitted entry distinctions.
* Food correction and reporting functionality.
* Custom food creation.

Every food entry should have a clear source or verification status.

Potential data sources should be evaluated for licensing, commercial usage, nutritional coverage, and API availability.

The database must not prioritize quantity over accuracy.

8. Body Composition and Progress Tracking

This is one of Leanward’s biggest opportunities for differentiation.

Users should be able to track more than body weight.

Metrics

* Daily body weight.
* Weekly average weight.
* Weight trends.
* Body fat percentage estimates.
* Waist circumference.
* Hip circumference.
* Other measurements.
* Strength progression.
* Progress photographs, optional.

Progress visualization

Users should see:

* Weight history.
* Body fat trends.
* Measurement changes.
* Strength improvements.
* Historical nutritional targets.
* Phase comparisons.

The app should distinguish measured, estimated, and algorithmically interpreted information.

It should not treat consumer smart-scale body fat measurements as exact.

Phase-specific progress

Different phases require different definitions of success.

For example:

Cutting:

* Weight trending downward.
* Waist circumference decreasing.
* Strength reasonably preserved.

Recomp:

* Waist circumference potentially decreasing.
* Strength increasing.
* Weight potentially remaining stable.

Lean bulk:

* Weight gradually increasing.
* Strength improving.
* Waist changes remaining within the user’s desired parameters.

Maintenance:

* Weight and measurements remaining relatively stable.
* Performance and nutritional consistency maintained.

9. Adaptive Nutrition Intelligence

This should become one of Leanward’s most valuable capabilities.

Rather than relying exclusively on static calorie calculations, Leanward should eventually estimate energy expenditure using actual food intake and weight trends.

Adaptive calorie recommendations

Potential process:

1. User logs daily food intake.
2. User records body weight.
3. Leanward calculates rolling weight averages.
4. The app analyzes trends over time.
5. It estimates actual energy expenditure.
6. It compares progress against the user’s goal.
7. It recommends adjustments when appropriate.

This concept is inspired by the adaptive approach used by MacroFactor.

Weekly check-ins

Provide a weekly progress assessment covering:

* Average calorie intake.
* Average protein intake.
* Weight trend.
* Measurement changes.
* Logging consistency.
* Progress relative to the current phase.

Recommendations should explain the reasoning behind any suggested changes.

The app should not automatically change targets without user awareness.

Nutrition intelligence

Identify patterns such as:

* Consistently low protein intake.
* Low fiber intake.
* High sodium intake.
* Low potassium intake.
* Nutritional gaps.
* Inconsistent calorie intake.
* Differences between planned and actual nutrition.

Insights should be educational and nonjudgmental.

10. Training and Health Integrations

Training data can help Leanward understand body composition changes.

Future integrations:

* Apple Health.
* Apple Watch.
* Garmin.
* Other fitness platforms.

Potential information:

* Daily activity.
* Exercise.
* Training frequency.
* Strength progression.
* Energy expenditure estimates.

Exercise calories should not automatically be added back to the food budget without a clearly defined and configurable methodology.

Leanward should not attempt to become a complete workout programming application.

Its purpose is to understand how nutrition and physical progress relate.

11. User Interface and Experience

The design should be premium, modern, minimalist, and intuitive.

Design inspiration:

* Oura.
* Whoop.
* Levels.
* Cronometer’s nutritional depth.

The interface should not feel like a spreadsheet or a complicated medical application.

Primary navigation

Five main sections:

1. Home.
2. Diary.
3. Progress.
4. Phase.
5. Profile.

Home dashboard

The home screen should immediately communicate:

* Current daily calorie intake.
* Remaining calories.
* Protein, carbohydrates, and fat.
* Current nutritional phase.
* Phase progress.
* Relevant daily insights.
* Quick food logging.

The dashboard should be customizable over time.

Diary

Detailed food logging, meals, recipes, and nutritional information.

Progress

Weight trends, body composition, measurements, photographs, and performance.

Phase

Current goal, current strategy, nutritional targets, phase history, and recommendations.

Profile

Personal information, preferences, integrations, subscription, and settings.

The default experience should be clean and uncluttered. Advanced nutritional information should be available without overwhelming the main dashboard.

12. What Leanward Should NOT Become

Product discipline is important.

Leanward should deliberately avoid:

* Becoming a social media platform.
* Public feeds and influencer content.
* Excessive gamification.
* Shame-based notifications.
* Punishing users for exceeding calorie targets.
* Encouraging crash diets.
* Automatically prescribing aggressive deficits.
* Requiring a cutting phase to use the app.
* Automatically changing nutritional targets without explanation.
* Presenting AI estimates as verified nutritional information.
* Becoming a full workout programming application.
* Overloading the dashboard with unnecessary charts.
* Making basic food logging inaccessible without a subscription.
* Creating unnecessary complexity for beginner users.

The product should be informative, supportive, and scientifically responsible.

13. Competitive Positioning

Leanward should learn from existing applications without copying their limitations.

Cronometer

Strength: Comprehensive nutritional and micronutrient tracking.

Opportunity: Improve usability, meal logging speed, and body composition management.

MyFitnessPal

Strength: Large food database and brand recognition.

Opportunity: Better database reliability, reduced advertising friction, and more useful nutritional insights.

MacroFactor

Strength: Adaptive energy expenditure estimation and nutrition coaching.

Opportunity: Combine adaptive nutrition with a broader body composition phase-management experience.

Lose It!

Strength: Accessible calorie tracking.

Opportunity: Provide more comprehensive nutritional information and personalized body composition management.

Competitive differentiation

Leanward’s defining combination:

1. Comprehensive nutrition tracking.
2. Multiple body composition goals.
3. Dedicated nutritional phase management.
4. Weight and measurement tracking.
5. Adaptive nutritional recommendations.
6. Progress assessments that consider more than weight.

The objective is to deliver an excellent tracking experience while making the user’s overall physical journey easier to understand.

14. Business Model

A freemium subscription model is recommended.

Free

* Food logging.
* Calories and macros.
* Basic food search.
* Basic barcode functionality, subject to data-source availability.
* Custom foods.
* Weight tracking.
* Basic progress charts.
* Basic goal and phase selection.

Premium

* Adaptive calorie recommendations.
* Advanced micronutrient analytics.
* Weekly progress assessments.
* Advanced phase analytics.
* AI photo and voice logging.
* Advanced recipes and meal planning.
* Integrations.
* Advanced reporting.

Basic tracking should remain genuinely useful without a subscription.

Premium should sell convenience, intelligence, and deeper analysis rather than access to fundamental functionality.

15. Development Roadmap

The product should be developed in stages.

Phase 1: MVP

Build the essential product first.

* iPhone application.
* User registration and onboarding.
* Personal profile.
* Goal selection.
* Nutritional phase selection.
* Calorie and macro calculations.
* Food database and search.
* Barcode scanning.
* Manual food entry.
* Custom foods.
* Daily food diary.
* Saved foods and meals.
* Weight tracking.
* Basic progress charts.
* Basic micronutrient tracking.
* Backend and persistent data storage.

The MVP must deliver a complete, reliable daily tracking experience.

Phase 2: Advanced Nutrition

* Recipe builder.
* Advanced micronutrient reports.
* AI photo logging.
* Voice logging.
* Advanced food search.
* Weekly check-ins.
* Adaptive calorie recommendations.
* Body measurements.
* Phase comparisons.
* Apple Health integration.

Phase 3: Intelligent Body Composition Platform

* Advanced adaptive nutrition.
* Garmin integration.
* Advanced body composition analytics.
* Training performance integration.
* Personalized nutritional insights.
* Meal planning.
* Grocery lists.
* Advanced reporting.
* Optional coach or dietitian sharing.

Build incrementally. Do not sacrifice core functionality to rush advanced AI features.

16. Technical and Architectural Principles

Leanward should be designed with long-term scalability in mind.

Key requirements:

* Modular architecture.
* Clear separation between frontend, backend, and business logic.
* Reliable database design.
* Secure authentication.
* Persistent cloud data.
* Accurate nutritional calculations.
* Versioned nutritional targets.
* Historical phase tracking.
* Reliable food database integration.
* API-ready architecture.
* Privacy-conscious health data management.

The architecture must distinguish:

* User goals.
* Nutritional phases.
* Daily targets.
* Actual nutritional intake.
* Body measurements.
* Progress history.
* Recommendations.
* Food database entries.

Goals and phases must be independent entities so users can change strategies without losing their underlying goals or history.

The app should initially prioritize iPhone, with architecture that supports future Android development.

17. Product Success Metrics

Leanward should measure whether people actually find the product useful.

Important metrics:

* Daily and weekly active users.
* Food logging completion.
* Average time required to log a meal.
* Food search success rate.
* Barcode lookup success rate.
* User retention.
* Weekly check-in completion.
* Phase engagement.
* Subscription conversion.
* User satisfaction.
* Food database correction rates.

A particularly important metric should be how quickly a returning user can log a frequently eaten meal.

Convenience and accuracy are essential to retention.

18. Final Product Philosophy

Leanward should be built around a simple idea:

Your nutrition should support your goals, not dictate them.

Some users want to lose fat. Others want to build muscle. Some want to maintain their physique. Others simply want to understand what they eat.

Leanward should accommodate all of them.

It should provide the nutritional detail of a serious tracking application, the intelligence of an adaptive nutrition platform, and the flexibility of a body composition management system.

It should never assume that one nutritional strategy is appropriate for everyone.

It should help users understand where they are, what they’re working toward, and whether their current approach is moving them in the right direction.

LEANWARD — Move toward better.

⸻

Foundational product decisions still to finalize:

* Food database sourcing and verification strategy.
* Exact free versus premium feature boundaries.
* Final onboarding questions and calculation methodology.
* Visual identity and design system.
* Backend architecture and technology stack.
* Adaptive nutrition algorithm.
* App Store and trademark clearance for the Leanward name.