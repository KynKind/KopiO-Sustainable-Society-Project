from app import app

print("Testing Flask app...")
print(f"Total routes: {len(list(app.url_map.iter_rules()))}")
print("\nRoutes with 'public' or 'leaderboard':")
for rule in app.url_map.iter_rules():
    if 'public' in str(rule) or 'leaderboard' in str(rule):
        print(f"  {rule.rule} - {list(rule.methods)}")

# Start server
if __name__ == '__main__':
    print("\nStarting server...")
    app.run(host='0.0.0.0', port=5000, debug=False)
