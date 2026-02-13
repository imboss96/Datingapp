# Chat Long-Press Options - Quick Reference

## What's New?

Long-press on any chat to get your options!

```
Mobile (Touch):
┌──────────────────────┐
│  [User Chat]         │  ← Hold for 500ms
│ ..................... │
│  [Options Menu]      │ ← Appears after hold
│  • Block             │
│  • Delete            │
│  • Cancel            │
└──────────────────────┘

Desktop (Right-Click):
│
├─ Hold down on chat
│  & wait 500ms
│
└─ Or right-click
   Context menu
   appears
```

## Available Options

### 🛑 Block
- Hides all messages from this person
- Calls won't come through
- They won't see you online
- You can unblock later in settings

### 🗑️ Delete
- Removes chat from your list
- Message history disappears for you
- If the other person still has it, they see it
- Let both people delete to fully remove

### ✕ Cancel
- Closes menu without doing anything
- Or tap outside the menu

---

## How to Use

### Mobile (All Devices)
1. **Long Press**: Hold your finger on a chat for 500ms
2. **Menu Appears**: Bottom sheet slides up with options
3. **Choose Action**: Tap the option you want
4. **Done**: Chat is updated immediately

### Desktop (Computer)
1. **Right Click**: Right-click on a chat
2. **Menu Appears**: Options popup appears
3. **Choose Action**: Click the option you want
4. **Done**: Chat is updated immediately

### Keyboard
1. Access via mobile/desktop first
2. Arrows to navigate options
3. Enter to select
4. Escape to cancel

---

## What Happens After Action

### After Delete
```
✓ Chat removed from your list
✓ Messages cleared
✓ Can still be restored by other user
✓ If both delete: fully removed from database
```

### After Block
```
✓ Chat removed from your list
✓ Messages hidden
✓ Calls blocked
✓ Can unblock in settings if needed
```

---

## Important Notes

- **Timing**: Hold for 500ms (half second) to trigger
- **Backup**: Deleted chats aren't lost until other user also deletes
- **Reversible**: Delete is reversible if other person has chat
- **Private**: Each user has independent delete state
- **No Notification**: The other user doesn't know you deleted them

---

## Common Scenarios

### Scenario 1: You want to remove a conversation
```
1. Find the chat
2. Long-press (hold 500ms)
3. Tap "Delete Chat"
4. Chat disappears from your list
5. Other person's chat still exists on their end
6. If they also delete: fully gone
```

### Scenario 2: Someone is bothering you
```
1. Find the chat
2. Long-press (hold 500ms)
3. Tap "Block"
4. Person is blocked
5. Their messages won't show
6. You can unblock anytime
```

### Scenario 3: You accidentally tapped long-press
```
1. Menu appears
2. Don't want any action?
3. Tap "Cancel" or tap outside
4. Menu closes
5. Nothing happens
```

---

## Troubleshooting

### Menu doesn't appear
- **Check**: Are you holding long enough? Need 500ms
- **Try**: Hold your finger still for a full half-second
- **Desktop**: Right-click instead (might be easier)

### Menu appeared but won't close
- **Try**: Tap outside the menu on the background
- **Or**: Tap "Cancel" button

### Chat didn't delete
- **Check**: Did it show a loading spinner?
- **Wait**: Let the action complete before leaving
- **Refresh**: Close and reopen app to verify

### Need to undo delete
- **For you**: Already removed from your list
- **To restore**: Ask the other person to un-block or tell the admin
- **Note**: Hard delete (both users) is permanent

---

## Settings & Customization

### Future Options (Coming Soon)
- Adjust long-press timing
- Add more options (mute, pin, archive)
- Haptic feedback on long-press
- Undo for 30 seconds after delete

Currently these are all set to defaults, optimized for most users.

---

## Pro Tips

**Tip 1: Don't Worry About Mistakes**
If you accidentally delete, the other person still has it, so the chat isn't lost.

**Tip 2: Use Block for Unwanted People**
Block stops messages and calls but preserves chat history (for you).

**Tip 3: Desktop Users**
Right-click is often faster than finding and holding on touch.

**Tip 4: Mobile Users**
Keep your finger still while holding - moving cancels the long-press.

---

## Under the Hood (For Nerds)

- **Technologies**: React, TypeScript, Node.js, MongoDB
- **Long-Press**: 500ms timeout with touch tracking
- **Deletion**: Soft-delete with user tracking, hard-delete when mutual
- **Blocking**: Same block logic as existing, just easier to access
- **Performance**: Optimistic UI, proper async/await handling

---

## Questions?

See full documentation in: **CHAT_LONGPRESS_FEATURE.md**

For support, check the settings or contact admin.
