import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Calendar, Award, BarChart2, MessageSquare, ThumbsUp, Send, Image as ImageIcon } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Post {
  id: string;
  author: string;
  type: string;
  title?: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

interface PollOption {
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
}

interface CommunityData {
  posts: Post[];
  events: Event[];
  polls: Poll[];
}

export function CommunityView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'feed' | 'announcements' | 'events' | 'recognition'>('feed');
  const [postContent, setPostContent] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', date: '', time: '', location: '' });
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const { data } = useQuery<CommunityData>({
    queryKey: ['community'],
    queryFn: () => fetcher('/api/community'),
  });

  const posts = data?.posts ?? [];
  const events = data?.events ?? [];
  const polls = data?.polls ?? [];

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'announcements') return p.type === 'announcement';
    if (activeTab === 'recognition') return p.type === 'recognition';
    return true;
  });

  const createPost = async () => {
    if (!postContent.trim()) return;
    await fetcher('/api/community/posts', { method: 'POST', body: JSON.stringify({ content: postContent }) });
    setPostContent('');
    qc.invalidateQueries({ queryKey: ['community'] });
  };

  const likePost = async (id: string) => {
    await fetcher(`/api/community/posts/${id}/like`, { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['community'] });
  };

  const votePoll = async (pollId: string, option: string) => {
    await fetcher(`/api/community/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ option }) });
    qc.invalidateQueries({ queryKey: ['community'] });
  };

  const createEvent = async () => {
    if (!eventForm.title || !eventForm.date) return;
    await fetcher('/api/community/events', { method: 'POST', body: JSON.stringify(eventForm) });
    qc.invalidateQueries({ queryKey: ['community'] });
    setShowEventForm(false);
    setEventForm({ title: '', date: '', time: '', location: '' });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Community</h2>
          <p className="text-gray-500 mt-1">Connect, share, and celebrate with your team.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {(['feed', 'announcements', 'events', 'recognition'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'events' ? (
        <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" /> Upcoming Events
          </h3>
          <div className="space-y-4">
            {events.map(ev => {
              const d = new Date(ev.date);
              return (
                <div key={ev.id} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-red-500 uppercase">{d.toLocaleString('en-US', { month: 'short' })}</span>
                    <span className="font-semibold text-gray-900">{d.getDate()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{ev.time} - {ev.location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold shrink-0">
                  {currentUser?.name?.charAt(0) || 'Y'}
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    placeholder="Share something with the team..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none h-20"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"><ImageIcon className="w-5 h-5" /></button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"><BarChart2 className="w-5 h-5" /></button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"><Award className="w-5 h-5" /></button>
                    </div>
                    <button onClick={createPost} className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2">
                      <Send className="w-4 h-4" /> Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No posts yet. Be the first to share!</p>
              ) : filteredPosts.map(post => (
                <div key={post.id} className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold', post.type === 'announcement' ? 'bg-emerald-100 text-emerald-600' : post.type === 'recognition' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600')}>
                        {post.author.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{post.author}</p>
                        <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
                      </div>
                    </div>
                    {post.type === 'announcement' && <Megaphone className="w-4 h-4 text-emerald-600" />}
                    {post.type === 'recognition' && <Award className="w-4 h-4 text-blue-600" />}
                  </div>
                  {post.title && <h3 className="font-semibold text-gray-900 text-lg">{post.title}</h3>}
                  <p className="text-gray-600 text-sm leading-relaxed">{post.content}</p>
                  <div className="pt-4 border-t border-gray-100 flex gap-4">
                    <button onClick={() => likePost(post.id)} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors text-sm font-medium">
                      <ThumbsUp className="w-4 h-4" /> {post.likes} Likes
                    </button>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
                      <MessageSquare className="w-4 h-4" /> {post.comments} Comments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Upcoming Events
                </h3>
                {isManager && (
                  <button onClick={() => setShowEventForm(!showEventForm)} className="text-xs text-emerald-600 font-semibold">+ Add</button>
                )}
              </div>
              {showEventForm && (
                <div className="mb-4 space-y-2">
                  <input placeholder="Event title" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input placeholder="Time" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input placeholder="Location" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <button onClick={createEvent} className="w-full bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg">Create Event</button>
                </div>
              )}
              <div className="space-y-4">
                {events.slice(0, 3).map(ev => {
                  const d = new Date(ev.date);
                  return (
                    <div key={ev.id} className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-red-500 uppercase">{d.toLocaleString('en-US', { month: 'short' })}</span>
                        <span className="font-semibold text-gray-900">{d.getDate()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{ev.time} - {ev.location}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {polls[0] && (
              <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-gray-400" /> Active Polls
                </h3>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">{polls[0].question}</p>
                  <div className="space-y-2">
                    {polls[0].options.map(opt => {
                      const total = polls[0].options.reduce((s, o) => s + o.votes, 0) || 1;
                      const pct = Math.round((opt.votes / total) * 100);
                      return (
                        <button key={opt.label} onClick={() => votePoll(polls[0].id, opt.label)} className="relative w-full text-left">
                          <div className="absolute inset-y-0 left-0 bg-blue-50 rounded-lg z-0" style={{ width: `${pct}%` }} />
                          <div className="relative z-10 flex justify-between p-2.5 text-sm">
                            <span className="font-medium text-gray-900">{opt.label}</span>
                            <span className="text-blue-600 font-semibold">{pct}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-right">{polls[0].options.reduce((s, o) => s + o.votes, 0)} total votes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}