import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { deleteEvent, getEvent, resolveEventImageUrl, getCommentsForEvent, createComment, deleteComment } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

function formatListingDate(eventDate) {
  if (!eventDate) return '—';
  const d = typeof eventDate === 'string' ? new Date(eventDate) : new Date(eventDate);
  if (Number.isNaN(d.getTime())) return String(eventDate);
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(d);
}

export default function EventDetailScreen() {
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getEvent(id);
      setEvent(data);
      try {
        const commentsData = await getCommentsForEvent(id);
        setComments(commentsData);
      } catch (err) {
        console.warn('Yorumlar yüklenemedi', err);
      }
    } catch {
      setEvent(null);
      Alert.alert('Hata', 'İlan bulunamadı veya yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = () => {
    Alert.alert('İlanı sil', 'Bu işlem geri alınamaz. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteEvent(id);
            router.replace('/');
          } catch (e) {
            if (e?.response?.status === 403) {
              Alert.alert('Yetki yok', 'Bu ilanı silme yetkiniz yok.');
            } else {
              Alert.alert('Hata', 'İlan silinemedi.');
            }
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await createComment(id, newCommentText.trim());
      setComments([newComment, ...comments]);
      setNewCommentText('');
    } catch (_err) {
      Alert.alert('Hata', 'Yorum eklenemedi.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await deleteComment(commentId);
            setComments(comments.filter(c => c.id !== commentId));
          } catch (_err) {
            Alert.alert('Hata', 'Yorum silinemedi.');
          }
        }
      }
    ]);
  };

  const kindLabel = event?.listingKind === 'FOUND' ? 'Buluntu bildirimi' : 'Kayıp ilanı';
  const catLabel = event?.listingCategory === 'ANIMAL' ? 'Hayvan' : 'Eşya';
  const imgUri = event?.imageUrl ? resolveEventImageUrl(event.imageUrl) : null;

  const isOwner =
    user?.userId != null &&
    event?.ownerId != null &&
    Number(user.userId) === Number(event.ownerId);

  return (
    <View style={styles.screen}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : !event ? (
          <View style={styles.centered}>
            <Text style={styles.muted}>İlan bulunamadı.</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Geri dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {imgUri ? (
              <Image source={{ uri: imgUri }} style={styles.hero} contentFit="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="image-outline" size={48} color="#94a3b8" />
                <Text style={styles.heroPlaceholderText}>Görsel yok</Text>
              </View>
            )}

            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{kindLabel}</Text>
              </View>
              <View style={[styles.badge, styles.badgeOutline]}>
                <Text style={styles.badgeTextMuted}>{catLabel}</Text>
              </View>
            </View>

            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.dateText}>Tarih: {formatListingDate(event.eventDate)}</Text>
            <Text style={styles.coordText}>
              Konum: {Number(event.latitude).toFixed(5)}, {Number(event.longitude).toFixed(5)}
            </Text>
            {event.locationLabel ? (
              <Text style={styles.placeText}>Yer: {event.locationLabel}</Text>
            ) : null}

            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.body}>{event.description || '—'}</Text>

            {!isOwner ? (
              <Text style={styles.ownerHint}>
                {user?.userId == null
                  ? 'Hesabınızda kullanıcı kimliği yok; düzenlemek için çıkış yapıp tekrar giriş yapın.'
                  : event.ownerId == null
                    ? 'Bu ilan eski bir kayıt; sahip bilgisi yok. Düzenleme ve silme kapalıdır.'
                    : 'Düzenleme ve silme yalnızca ilan sahibine açıktır.'}
              </Text>
            ) : null}

            {isOwner ? (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push(`/edit-event/${id}`)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={22} color="#fff" />
                  <Text style={styles.primaryBtnText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dangerBtn, deleting && styles.btnDisabled]}
                  onPress={onDelete}
                  disabled={deleting}
                  activeOpacity={0.85}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={22} color="#fff" />
                      <Text style={styles.dangerBtnText}>Sil</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>Yorumlar</Text>

              {user?.userId ? (
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Bir yorum yazın..."
                    value={newCommentText}
                    onChangeText={setNewCommentText}
                    multiline
                  />
                  <TouchableOpacity 
                    style={[styles.commentBtn, submittingComment && styles.btnDisabled]} 
                    onPress={handleAddComment}
                    disabled={submittingComment}
                  >
                    <Text style={styles.commentBtnText}>Gönder</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.loginToComment}>Yorum yapmak için giriş yapmalısınız.</Text>
              )}

              {comments.length > 0 ? (
                comments.map(comment => (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                      <Text style={styles.commentDate}>{formatListingDate(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                    {user?.userId && Number(user.userId) === Number(comment.authorId) && (
                      <TouchableOpacity 
                        style={styles.deleteCommentBtn}
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <Text style={styles.deleteCommentBtnText}>Sil</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.noCommentsText}>Henüz yorum yapılmamış.</Text>
              )}
            </View>
          </ScrollView>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  muted: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  hero: {
    width: '100%',
    height: 220,
    backgroundColor: '#e2e8f0',
  },
  heroPlaceholder: {
    height: 160,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  badge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeOutline: {
    backgroundColor: '#f1f5f9',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
  badgeTextMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  dateText: {
    fontSize: 15,
    color: '#64748b',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  coordText: {
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 20,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  placeText: {
    fontSize: 15,
    color: '#334155',
    paddingHorizontal: 20,
    marginTop: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1e293b',
    paddingHorizontal: 20,
  },
  ownerHint: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 16,
  },
  dangerBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  secondaryBtnText: {
    fontWeight: '700',
    color: '#334155',
  },
  commentsSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 5,
  },
  commentInputContainer: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  commentBtn: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  commentBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  loginToComment: {
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  commentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  commentAuthor: {
    fontWeight: '800',
    color: '#0f172a',
    fontSize: 15,
  },
  commentDate: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  commentContent: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 24,
  },
  deleteCommentBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  deleteCommentBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  noCommentsText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
    fontWeight: '500',
  },
});
