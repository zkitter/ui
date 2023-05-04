import React, { ReactElement, useCallback, useState } from 'react';
import Button from '@components/Button';
import { CoverImageEditor, ProfileImageEditor } from '../../ProfileView';
import Input from '@components/Input';
import Textarea from '@components/Textarea';
import { useDispatch } from 'react-redux';
import { updateOnboardingProfile } from '@ducks/onboarding';

export default function ProfileCreation(props: {
  onNext: () => void;
  onBack: () => void;
}): ReactElement {
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const dispatch = useDispatch();

  const isEmpty = !coverImageUrl && !profileImageUrl && !name && !bio && !website;

  const onSaveProfile = useCallback(() => {
    dispatch(
      updateOnboardingProfile({
        coverImageUrl,
        profileImageUrl,
        name,
        bio,
        website,
      })
    );
    props.onNext();
  }, [coverImageUrl, profileImageUrl, name, bio, website]);

  return (
    <div className="flex flex-col flex-nowrap flex-grow my-4 signup__content signup__welcome">
      <div className="flex flex-row items-center justify-center my-2">
        <div className="text-xl mr-2">🎉</div>
        <div className="text-xl font-semibold">Setup Profile</div>
      </div>
      <div className="my-2 border-t border-b border-gray-200 signup__profile-content">
        <CoverImageEditor url={coverImageUrl} onUrlChange={setCoverImageUrl} />
        <ProfileImageEditor url={profileImageUrl} onUrlChange={setProfileImageUrl} />
        <Input
          className="border relative mx-4 mt-4 mb-8"
          label="Name"
          onChange={e => setName(e.target.value)}
          value={name}
        />
        <Textarea
          className="border relative mx-4 mt-4 mb-8"
          label="Bio"
          rows={4}
          onChange={e => setBio(e.target.value)}
          value={bio}
        />
        <Input
          className="border relative mx-4 mt-4 mb-8"
          label="Website"
          onChange={e => setWebsite(e.target.value)}
          value={website}
        />
      </div>
      <div className="flex-grow flex flex-row mt-2 mx-8 flex-nowrap items-end justify-end">
        <div className="flex-grow flex flex-row items-end">
          <Button btnType="secondary" className="mr-4" onClick={props.onBack}>
            Back
          </Button>
        </div>
        <div className="flex-grow flex flex-row items-end justify-end">
          <Button btnType="secondary" className="mr-4" onClick={props.onNext}>
            Skip
          </Button>
          <Button btnType="primary" onClick={onSaveProfile} disabled={isEmpty}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
